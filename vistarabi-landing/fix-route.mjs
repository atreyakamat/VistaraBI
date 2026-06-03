import fs from 'fs';
const file = 'src/app/api/projects/[id]/ask-ai/route.ts';
let data = fs.readFileSync(file, 'utf8');

const oldCondition = `        // Generate conversational wrapper over the 6A-E layers
        let conversationalPreamble = '';
        if (safeResult.status === 'success' || safeResult.status === 'clarification_required') {`;

const newCondition = `        // Generate conversational wrapper over the 6A-E layers
        let conversationalPreamble = '';
        if (['success', 'clarification_required', 'unsupported', 'rejected'].includes(safeResult.status as string)) {`;

data = data.replace(oldCondition, newCondition);

const oldPrompt = `                const systemPrompt = \`You are VistaraBI, an evidence-governed BI copilot.
Write a 1-sentence, natural, conversational response summarizing the data payload for the user. Do not just say "Response received" or similar generic acknowledgments. Actually state the metric value, trend, or finding from the payload.
RULES:
1. DO NOT hallucinate numbers. Use only the numbers provided.
2. DO NOT use words like "because", "due to", or infer causation unless explicitly in the payload.
3. Keep it extremely brief and friendly. No markdown. If the payload is 'clarification_required', ask the user to clarify.\${strategyContextBlock}\`;`;

const newPrompt = `                const systemPrompt = \`You are VistaraBI, an evidence-governed BI copilot.
Write a 1-2 sentence, natural, conversational response based on the data payload.
RULES:
1. If the payload indicates success, state the metric value, trend, or finding directly. Do NOT just say "Response received".
2. If the payload is 'unsupported' or 'rejected', politely explain you focus on business KPIs and use the suggested questions to guide them.
3. DO NOT hallucinate numbers. Use only the numbers provided.
4. DO NOT use words like "because", "due to", or infer causation unless explicitly in the payload.
5. Keep it extremely brief and friendly. No markdown. If the payload is 'clarification_required', ask the user to clarify.\${strategyContextBlock}\`;`;

data = data.replace(oldPrompt, newPrompt);

fs.writeFileSync(file, data);
console.log('Update complete.');
