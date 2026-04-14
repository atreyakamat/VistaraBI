import { generateWithFallback, type AgentRole, type AIResponse } from './unified-ai-client';
import { DomainType } from '@/lib/prisma';
import { getDomainModel } from './ollama-client';
import { getDomainKPINames } from '@/lib/kpi/domain-metadata';

export interface MetaContext {
    query: string;
    domain?: DomainType;
    datasets: Record<string, string[]>; // Map of filename -> columns
    chatHistory?: string;
    metrics?: any;
}

export interface RoutingDecision {
    agentRole: AgentRole;
    reasoning: string;
    confidence: number;
}

/**
 * Master Router Agent
 * 
 * Scans the overall query, context, and available datasets to determine:
 * 1. Which specialized AI agent persona is best suited for the task.
 * 2. What context needs to be injected into the prompt.
 * 
 * Uses the generalized model (or a lightweight one) to make the routing decision, 
 * then executes the request using the chosen specialized agent.
 */
export class MasterAgent {
    /**
     * Determine the correct specialized agent based on the query and context.
     */
    static async determineRouting(context: MetaContext): Promise<RoutingDecision> {
        const prompt = `
            You are the Master Context Router for VistaraBI.
            Your task is to analyze the user query and available data context, then select the most appropriate AI agent role.

            Available Roles:
            - 'business-analyst': For interpreting KPIs, trends, and business strategy.
            - 'data-engineer': For data quality, schema matching, or ETL tasks.
            - 'domain-expert': For classifying raw data into a business domain.
            - 'statistician': For forecasting, probability, and advanced analytics.
            - 'narrative-writer': For summarizing reports or writing executive prose.
            - 'strategy-planner': For goal setting and impact simulations.
            - 'quality-auditor': For finding errors or anomalies in data.
            - 'kpi-designer': For creating formulas and selecting metrics.
            - 'general': For generic chitchat or unrelated tasks.

            Context:
            - Query: "${context.query}"
            - Domain: ${context.domain || 'Unknown'}
            - Datasets Available: ${Object.keys(context.datasets).join(', ')}

            Respond strictly in JSON format:
            {
                "agentRole": "selected-role",
                "reasoning": "Why this role is best",
                "confidence": 0.95
            }
        `;

        try {
            const response = await generateWithFallback({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                agentRole: 'general' // Use general role to make the routing decision
            });

            // Parse JSON response
            const jsonMatch = response.content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    agentRole: parsed.agentRole as AgentRole,
                    reasoning: parsed.reasoning || "Context scan completed.",
                    confidence: parsed.confidence || 0.8
                };
            }
        } catch (error) {
            console.error("[MasterAgent] Routing failed, defaulting to general:", error);
        }

        return { agentRole: 'general', reasoning: 'Fallback due to error', confidence: 0.5 };
    }

    /**
     * Executes the query by first scanning the context, picking an agent, and injecting domain knowledge.
     */
    static async processRequest(context: MetaContext): Promise<AIResponse> {
        console.log(`[MasterAgent] Scanning context for query: "${context.query}"...`);
        
        // 1. Scan and Route
        const routing = await this.determineRouting(context);
        console.log(`[MasterAgent] Selected Role: ${routing.agentRole} (Confidence: ${routing.confidence})`);

        // 2. Inject Domain Vocabulary
        let domainVocab = '';
        if (context.domain) {
            const kpiNames = getDomainKPINames(context.domain);
            domainVocab = kpiNames.length > 0 
                ? `\n[Domain Injected Knowledge] Standard KPIs for ${context.domain} include: ${kpiNames.join(', ')}.\n` 
                : '';
        }

        // 3. Build Enriched Prompt
        const enrichedPrompt = `
            Task: ${context.query}
            ${domainVocab}
            
            Available Data Structures:
            ${JSON.stringify(context.datasets, null, 2)}
            
            Current Metrics Context:
            ${context.metrics ? JSON.stringify(context.metrics, null, 2) : 'None provided.'}
        `;

        // 4. Resolve Model (Use Domain Model if available, otherwise unified client handles fallback)
        const targetModel = context.domain ? getDomainModel(context.domain) : undefined;

        // 5. Execute with Specialized Agent
        console.log(`[MasterAgent] Executing with specialized agent role: ${routing.agentRole}`);
        const response = await generateWithFallback({
            messages: [{ role: 'user', content: enrichedPrompt }],
            temperature: 0.3,
            agentRole: routing.agentRole,
            model: targetModel
        });

        return response;
    }
}
