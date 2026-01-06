// AI Module Exports (Module 3 Phase 3C)

// Export from ollama-client
export {
    checkOllamaHealth,
    listModels,
    generateCompletion,
    generateKPISuggestions,
    type OllamaMessage,
    type OllamaGenerateOptions,
    type SemanticReasoningContext,
    type SemanticReasoningResult,
} from './ollama-client';

// Export from domain-reasoning
export {
    triggerDomainReasoning,
    getAIDomainReasoning,
    getEnhancedClassification,
    type AIDomainReasoning,
} from './domain-reasoning';
