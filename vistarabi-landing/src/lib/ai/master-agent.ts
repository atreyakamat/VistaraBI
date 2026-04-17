import { generateWithFallback, type AgentRole, type AIResponse } from './unified-ai-client';
import { DomainType } from '@/lib/prisma';
import { getDomainModel } from './ollama-client';
import { getDomainKPINames } from '@/lib/kpi/domain-metadata';
import { compressContext, buildCompressedPrompt, buildSemanticSignature } from './context-compressor';

export interface MetaContext {
    query: string;
    domain?: DomainType;
    datasets: Record<string, string[]>; // Map of filename -> columns
    chatHistory?: string;
    metrics?: unknown; // Full KPI result or array — compressor extracts scalars only
}

export interface RoutingDecision {
    agentRole: AgentRole;
    reasoning: string;
    confidence: number;
}

// FIX H2: Rule-based routing pre-filter — deterministic, 0-token, 0-latency.
// ~60% of production queries match here before the LLM is ever called.
// Ambiguous queries (no regex match) fall through to LLM routing.
const ROUTING_RULES: { pattern: RegExp; role: AgentRole }[] = [
    { pattern: /\b(trend|why|declined|increased|compared|root cause|yoy|mom|last quarter|last month|last week)\b/i, role: 'business-analyst' },
    { pattern: /\b(goal|target|plan|improve|action|recommend|next step|achieve|q3|q4|strategy|initiative)\b/i, role: 'strategy-planner' },
    { pattern: /\b(schema|column|etl|pipeline|transform|join|migrate|ingest|format|type mismatch)\b/i, role: 'data-engineer' },
    { pattern: /\b(missing|null|anomaly|outlier|duplicate|inconsistent|invalid|bad data|validate|completeness)\b/i, role: 'quality-auditor' },
    { pattern: /\b(forecast|predict|projection|simulate|monte carlo|probability|confidence interval)\b/i, role: 'statistician' },
    { pattern: /\b(kpi|metric|formula|measure|indicator|define|calculate|design)\b/i, role: 'kpi-designer' },
    { pattern: /\b(report|summarize|write|narrative|explain|describe|overview|executive)\b/i, role: 'narrative-writer' },
    { pattern: /\b(domain|industry|classify|sector|which domain|detect domain)\b/i, role: 'domain-expert' },
];

/**
 * Master Router Agent
 *
 * Scans the overall query, context, and available datasets to determine:
 * 1. Which specialized AI agent persona is best suited for the task.
 * 2. What context needs to be injected into the prompt.
 *
 * ACTION 3: Routing prompt now includes chat history and uses the refined
 * BA (diagnostic) vs SP (prescriptive) distinction for accurate routing.
 *
 * ACTION 5: Uses context-compressor to build token-efficient prompts.
 * FIX H2: Rule-based keyword pre-filter fires first — LLM only called for ambiguous queries.
 */
export class MasterAgent {
    /**
     * Determine the correct specialized agent based on the query and context.
     *
     * FIX H2: Tries ROUTING_RULES first (deterministic, 0-token) before going to LLM.
     * ACTION 3: LLM path injects chat history and explicit BA/SP disambiguation rules.
     */
    static async determineRouting(context: MetaContext): Promise<RoutingDecision> {
        // FIX H2: Rule-based pre-filter — fires before any LLM call.
        // Deterministic, 0 tokens, < 1ms latency.
        for (const rule of ROUTING_RULES) {
            if (rule.pattern.test(context.query)) {
                console.log(`[MasterAgent] Rule-based route: "${rule.role}" matched for query.`);
                return { agentRole: rule.role, reasoning: 'Keyword pre-filter match', confidence: 1.0 };
            }
        }

        // Fall through to LLM routing only for genuinely ambiguous queries.
        // ACTION 5 (Two-Tier): Router only sees Semantic Signatures, NOT full column lists.
        // "orders(12 cols: 8 numeric metrics, 2 date dims, 2 categorical dims)"
        // This limits routing prompt to ~50 tokens per source for the 0.6B local model.
        const routerSignature = buildSemanticSignature(context.datasets);

        const historySection = context.chatHistory
            ? `\nRecent Chat Context (last 3 turns):\n${context.chatHistory.slice(-400)}`
            : '';

        const prompt = `
You are the Master Context Router for VistaraBI.
Your task is to analyze the user query and select the most appropriate AI agent role.

KEY DISAMBIGUATION RULE:
- 'business-analyst'  → Use when the query asks about WHAT HAPPENED (diagnostic). 
  Trigger words: trend, why, declined, increased, compared, root cause, last period, YoY.
- 'strategy-planner'  → Use when the query asks WHAT TO DO NEXT (prescriptive).
  Trigger words: goal, target, plan, improve, action, recommend, next step, achieve, forecast.

Available Roles:
- 'business-analyst': Diagnose historical KPI trends and root causes.
- 'data-engineer': Data quality, schema matching, ETL tasks.
- 'domain-expert': Classify raw data into a business domain.
- 'statistician': Forecasting, probability, advanced analytics.
- 'narrative-writer': Summarize reports or write executive prose.
- 'strategy-planner': Goal setting, action plans, impact simulations.
- 'quality-auditor': Find errors or anomalies in data.
- 'kpi-designer': Create formulas and select metrics.
- 'general': Generic chitchat or unrelated tasks.

Context:
- Query: "${context.query}"
- Domain: ${context.domain || 'Unknown'}
- Data Signature (type summary only): ${routerSignature}${historySection}

Respond ONLY in JSON format (no markdown, no explanation outside JSON):
{
    "agentRole": "selected-role",
    "reasoning": "Why this role is best",
    "confidence": 0.95
}
        `.trim();

        try {
            const response = await generateWithFallback({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                agentRole: 'general', // Use general role to make the routing decision
            });

            // Parse JSON response — strip any surrounding markdown if present
            const jsonMatch = response.content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    agentRole: parsed.agentRole as AgentRole,
                    reasoning:  parsed.reasoning  || 'Context scan completed.',
                    confidence: parsed.confidence || 0.8,
                };
            }
        } catch (error) {
            console.error('[MasterAgent] Routing failed, defaulting to general:', error);
        }

        return { agentRole: 'general', reasoning: 'Fallback due to routing error', confidence: 0.5 };
    }

    /**
     * Executes the query by first scanning the context, picking an agent,
     * and injecting domain knowledge.
     *
     * ACTION 5: Uses compressContext() + buildCompressedPrompt() to replace
     * the raw JSON.stringify(context.datasets) that previously dumped 200+
     * columns per request. Reduces cloud model input by ~70%.
     */
    static async processRequest(context: MetaContext): Promise<AIResponse> {
        console.log(`[MasterAgent] Scanning context for query: "${context.query}"...`);

        // 1. Scan and Route
        const routing = await this.determineRouting(context);
        console.log(`[MasterAgent] Selected Role: ${routing.agentRole} (Confidence: ${routing.confidence})`);

        // 2. Build compressed prompt (ACTION 5: replaces raw JSON.stringify)
        // buildCompressedPrompt injects:
        // - Domain + standard KPI vocabulary (not raw columns)
        // - Schema digest: "file(N cols: col1, col2, ...+K more)"
        // - Query-relevant columns (keyword match top-5)
        // - Metrics digest: scalar values only (KPI name + value + delta)
        // - Last 500 chars of chat history
        const compressedPrompt = buildCompressedPrompt(context);

        // 3. Resolve Model (Use Domain Model if available, otherwise unified client handles fallback)
        const targetModel = context.domain ? getDomainModel(context.domain) : undefined;

        // 4. Execute with Specialized Agent
        console.log(`[MasterAgent] Executing with specialized agent role: ${routing.agentRole}`);
        const response = await generateWithFallback({
            messages:    [{ role: 'user', content: compressedPrompt }],
            temperature: 0.3,
            agentRole:   routing.agentRole,
            model:       targetModel,
        });

        return response;
    }
}
