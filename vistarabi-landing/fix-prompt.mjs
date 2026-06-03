import fs from 'fs';
const file = 'src/app/api/projects/[id]/ask-ai/route.ts';
let data = fs.readFileSync(file, 'utf8');
data = data.replace('Write a 1-sentence, natural, conversational response acknowledging the result.', 'Write a 1-sentence, natural, conversational response summarizing the data payload for the user. Do not just say "Response received" or similar generic acknowledgments. Actually state the metric value, trend, or finding from the payload.');
fs.writeFileSync(file, data);
