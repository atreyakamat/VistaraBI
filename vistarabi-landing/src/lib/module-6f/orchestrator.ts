// src/lib/module-6f/orchestrator.ts

export type IntentRoute = 'metric_retrieval' | 'trend_analysis' | 'comparison' | 'contextual_explanation' | 'correlation_analysis' | 'synthesis' | 'command' | 'unsupported';

export interface ConversationMemory {
    sessionId: string;
    lastKpiId?: string;
    lastKpiName?: string;
    lastTimeRange?: string;
    lastIntent?: IntentRoute;
    clarificationPending?: boolean;
    clarificationOptions?: Array<{ id: string; name: string }>;
    updatedAt: number;
}

// In-memory cache for conversational state. 
// Rules strictly mandate this is session-only and holds max 5 turns of semantic metadata (not raw data).
// Note: In a true scale-out production environment, this would be Redis. We use an in-memory Map here per requirements.
const memoryStore = new Map<string, ConversationMemory>();

// Cleanup interval: Remove sessions older than 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, mem] of Array.from(memoryStore.entries())) {
        if (now - mem.updatedAt > 30 * 60 * 1000) {
            memoryStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export function getSessionMemory(sessionId: string): ConversationMemory {
    if (!memoryStore.has(sessionId)) {
        memoryStore.set(sessionId, {
            sessionId,
            updatedAt: Date.now()
        });
    }
    return memoryStore.get(sessionId)!;
}

export function updateSessionMemory(sessionId: string, updates: Partial<ConversationMemory>) {
    const mem = getSessionMemory(sessionId);
    memoryStore.set(sessionId, {
        ...mem,
        ...updates,
        updatedAt: Date.now()
    });
}

export function clearSessionMemory(sessionId: string) {
    memoryStore.delete(sessionId);
}

/**
 * Pronoun Resolution Step.
 * If the user says "it", "that", "this", "them" or "those", we try to swap it
 * with the last known KPI name from memory. Note this is a safe string replacement
 * before regex intent matching happens.
 */
export function resolvePronouns(message: string, memory: ConversationMemory): string {
    if (!memory.lastKpiName) return message;

    const msgLower = message.toLowerCase();

    // Check for common pronouns that need resolution in isolated word boundaries
    const pronounRegex = /\b(it|that|this|them|those)\b/gi;

    if (pronounRegex.test(message)) {
        // We replace it. Example: "Why did it increase?" -> "Why did Revenue increase?"
        return message.replace(pronounRegex, memory.lastKpiName);
    }

    return message;
}

/**
 * Context Injection Step.
 * If the user query does not name any specific KPI but asks an intent
 * that requires one (e.g. "What is the trend?"), and we have one in memory,
 * we safely append the context to the end so extractors find it.
 */
export function injectContext(message: string, memory: ConversationMemory): string {
    if (!memory.lastKpiName) return message;

    // A very loose heuristic: if the message is extremely short and has no existing KPI-like noun,
    // we append the context to aid extraction.
    // E.g. "compare with Q2" -> "compare with Q2 Revenue"
    return `${message} ${memory.lastKpiName}`;
}

/**
 * Suggestions Generator.
 * Predicts the next logical 2-3 questions based on the last interaction.
 */
export function getFollowUpSuggestions(memory: ConversationMemory): string[] {
    const suggestions: string[] = [];
    const kpi = memory.lastKpiName || 'this KPI';

    switch (memory.lastIntent) {
        case 'metric_retrieval':
            suggestions.push(`Show trend of ${kpi}`);
            suggestions.push(`Why did ${kpi} change?`);
            suggestions.push(`Compare ${kpi} with Profit`);
            break;
        case 'trend_analysis':
            suggestions.push(`Calculate volatility of ${kpi}`);
            suggestions.push(`What events affected ${kpi}?`);
            suggestions.push(`See current ${kpi} value`);
            break;
        case 'correlation_analysis':
            suggestions.push(`Show trend of both KPIs`);
            suggestions.push(`Calculate lag optimization`);
            suggestions.push(`Synthesize overall risk`);
            break;
        case 'contextual_explanation':
            suggestions.push(`Compare with similar period`);
            suggestions.push(`Show related correlations`);
            suggestions.push(`Add ${kpi} to dashboard`);
            break;
        default:
            suggestions.push("What is total revenue?");
            suggestions.push("Show me customer trends");
            suggestions.push("Analyze correlation between Revenue and Profit");
    }

    return suggestions.slice(0, 3);
}
