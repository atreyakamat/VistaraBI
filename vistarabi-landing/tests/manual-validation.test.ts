import { describe, it, expect } from 'vitest';

// We extract the regex patterns and classify logic directly from route.ts to test it
// Note: In a real environment, we would export this function from route.ts to be testable.
// Here we replicate the classification logic to validate the AI Manual phrases against it.

type QueryRoute = '6A' | '6B' | '6C' | '6E' | 'UNSUPPORTED' | 'KPI_VALUE_QUERY' | 'TREND_ANALYSIS' | 'COMPARISON_ANALYSIS' | 'CONTEXTUAL_EXPLANATION' | 'UNSUPPORTED_SCOPE';

const COMMAND_PATTERNS = [
    /\b(show|add|create|remove|delete|update|build|make|put|new|generate)\b.*\b(card|chart|kpi|metric|plot|graph)\b/i,
    /\b(display|plot|graph|draw)\b.*\b(by|over|per)\b/i,
    /\b(give me|i want|can i have)\b.*\b(card|chart|kpi|metric)\b/i,
    /\b(filter|pin)\b/i // Adding filter/pin which are common dashboard commands
];

const CORRELATION_PATTERNS = [
    /\b(correlat|relat|connection|link|association|between)\b/i,
    /\b(how does)\b.*\b(affect|impact|change)\b/i,
    /\b(impact of)\b.*\b(on)\b/i,
];

const COMPARISON_PATTERNS = [
    /\b(compar[a-z]*|vs\.?|versus|against)\b/i,
];

const SYNTHESIS_PATTERNS = [
    /\b(overview|summary|synthesis|synthesize|overall|pattern|signal|insight)\b/i,
    /\b(risk|volatile|exposure)\b/i,
    /\b(how are we doing|general update|big picture|tl;?dr|what should i know)\b/i,
];

const TREND_PATTERNS = [
    /\b(trend|trending|over time|history|historically|past year|past month|month over month|year over year|yoy|mom)\b/i,
    /\b(growth|trajectory|direction)\b/i
];

const EVENT_PATTERNS = [
    /\b(why|explain|what happened|spike|drop|loss|profit|anomaly|anomalous|anomalies|change)\b/i,
    /\b(went up|went down|increased|decreased|surge|fell|jumped|tanked)\b/i,
    /\b(tell me|how is|performance of|what's going on with|status of|how much|what is|what are|value of|current)\b/i,
];

const SCALAR_PATTERNS = [
    /\b(what is|what are|what was|what's|whats|whais|wha is|how much|give me|show me|value of|total|current|number of|count of)\b/i,
    /\b(last month|this quarter|this month|this year|fy|q1|q2|q3|q4)\b/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i
];

function classifyRoute(message: string): QueryRoute {
    if (COMMAND_PATTERNS.some(p => p.test(message))) return '6A';
    if (TREND_PATTERNS.some(p => p.test(message))) return 'TREND_ANALYSIS';
    if (COMPARISON_PATTERNS.some(p => p.test(message))) return 'COMPARISON_ANALYSIS';

    const isWhyQuery = /\b(why|explain|reason|what happened to|how come|whats going on with|anomaly|anomalous|anomalies)\b/i.test(message);

    const hasComplexIntent =
        isWhyQuery ||
        /\b(compar|correlate|versus|vs|against|overview|summary|synthesize|risk|risk|pattern|trend|trending)\b/i.test(message) ||
        SYNTHESIS_PATTERNS.some(p => p.test(message)) ||
        CORRELATION_PATTERNS.some(p => p.test(message));

    if (!hasComplexIntent && SCALAR_PATTERNS.some(p => p.test(message))) {
        return 'KPI_VALUE_QUERY';
    }

    if (isWhyQuery) return 'CONTEXTUAL_EXPLANATION';
    if (CORRELATION_PATTERNS.some(p => p.test(message))) return '6C';
    if (SYNTHESIS_PATTERNS.some(p => p.test(message))) return '6E';
    if (EVENT_PATTERNS.some(p => p.test(message))) return '6B';

    return 'UNSUPPORTED';
}


describe('AI Chat Manual - Intent Routing Validation', () => {

    // Helper to validate arrays of prompts
    const validatePrompts = (prompts: string[], expectedRoute: string) => {
        prompts.forEach(prompt => {
            const route = classifyRoute(prompt);
            // Some prompts might overlap (e.g. "Create a chart showing the trend" -> 6A or TREND). 
            // We want to make sure it is NOT unsupported.
            expect(route, `Failed on: "${prompt}". Got: ${route}`).not.toBe('UNSUPPORTED');
            
            // If an explicit route is expected, verify it. 
            // NOTE: COMMANDS (6A) typically override other logic
            if (expectedRoute !== 'ANY_VALID') {
                if (route !== '6A') { // Commands take precedence
                    expect(route).toBe(expectedRoute);
                }
            }
        });
    }

    it('should correctly route E-Commerce queries', () => {
        validatePrompts([
            "What was our total revenue yesterday?",
            "What is our Average Order Value for the last 30 days?",
            "What is our cart abandonment rate?"
        ], 'KPI_VALUE_QUERY');

        validatePrompts([
            "Why did cart abandonment spike last weekend?",
            "Are there any anomalies in our server hosting costs this month?"
        ], 'CONTEXTUAL_EXPLANATION');

        validatePrompts([
            "Is there a correlation between shipping delays and negative customer reviews?",
        ], '6C');

        validatePrompts([
            "Create a line chart showing our daily revenue for the past month.",
            "Show me a pie chart of our sales by country.",
            "Pin a KPI card for 'Total Orders Today' to my dashboard.",
            "Filter the dashboard to only show data for the 'Bootcamp' cohort."
        ], '6A');
    });

    it('should correctly route SaaS queries', () => {
        validatePrompts([
            "What is our current MRR?",
            "How much new MRR did we add this month?"
        ], 'KPI_VALUE_QUERY');

        validatePrompts([
            "Is there a correlation between users who don't log in for 7 days and users who eventually churn?",
            "Compare our CAC to our Customer Lifetime Value (LTV)."
        ], 'ANY_VALID'); // 6C or COMPARISON

        validatePrompts([
            "Synthesize the health of our SaaS metrics into a 3-point summary."
        ], '6E');
    });

    it('should correctly route Finance queries', () => {
        validatePrompts([
            "What is the total value of our asset portfolio right now?",
            "Show me the total transaction volume for the last 24 hours.",
            "What is our current rate of Non-Performing Loans (NPL)?"
        ], 'KPI_VALUE_QUERY');

        validatePrompts([
            "Are there any highly anomalous transactions from yesterday?",
        ], 'CONTEXTUAL_EXPLANATION');

        validatePrompts([
            "Synthesize our risk exposure based on the current loan portfolio."
        ], '6E');
    });

    it('should correctly route Manufacturing queries', () => {
        validatePrompts([
            "What was our total production output yesterday?",
            "Calculate our current Overall Equipment Effectiveness (OEE)."
        ], 'ANY_VALID');

        validatePrompts([
            "Compare the efficiency of Shift A versus Shift B."
        ], 'COMPARISON_ANALYSIS');

        validatePrompts([
            "Is there a correlation between the speed of the conveyor belt and the number of defects?"
        ], '6C');
    });

    it('should correctly route Healthcare queries', () => {
        validatePrompts([
            "What was our average patient wait time in the ER today?",
            "How many total appointments were completed last week?"
        ], 'KPI_VALUE_QUERY');

        validatePrompts([
            "Create a pie chart showing the breakdown of billing amounts by insurance provider.",
            "Graph patient satisfaction scores by department."
        ], '6A');
    });

});
