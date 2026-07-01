import fs from 'fs';

const panelPath = 'vistarabi-landing/src/components/dashboard/GoalStrategyPanel.tsx';
let code = fs.readFileSync(panelPath, 'utf8');

// Add StrategyDocView function before StrategyCanvasView
const docViewCode = `
// ─── Strategy Document View ───────────────────────────────────────────────────

function StrategyDocView({ canvas, onBack }: { canvas: StrategyCanvas, onBack: () => void }) {
    return (
        <div className="goal-doc-view bg-white p-6 rounded-md text-slate-800 h-full overflow-y-auto absolute inset-0 z-50 print:p-0 print:absolute print:inset-0">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <button onClick={onBack} className="flex items-center text-sm text-slate-500 hover:text-slate-800">
                    <span className="material-symbols-outlined text-sm mr-1">arrow_back</span>
                    Interactive View
                </button>
                <button onClick={() => window.print()} className="flex items-center text-sm bg-violet-600 text-white px-3 py-1.5 rounded hover:bg-violet-700">
                    <span className="material-symbols-outlined text-sm mr-1">print</span>
                    Print / Save PDF
                </button>
            </div>

            <h1 className="text-2xl font-bold mb-2">Strategy Execution Document</h1>
            <p className="text-sm text-slate-500 mb-6">Generated on {new Date(canvas.generatedAt).toLocaleString()}</p>
            
            <h2 className="text-lg font-bold border-b pb-1 mb-3">1. Executive Goal</h2>
            <p className="mb-6"><strong>Objective:</strong> {canvas.goal.changeDirection} {canvas.goal.targetMetric} by {canvas.goal.targetValue} ({canvas.goal.timeframe})</p>

            <h2 className="text-lg font-bold border-b pb-1 mb-3">2. KPI Decomposition</h2>
            <p className="mb-2 text-sm italic">{canvas.decomposed.formula}</p>
            <ul className="list-disc pl-5 mb-6">
                {canvas.decomposed.factors.map((f, i) => (
                    <li key={i} className="mb-1"><strong>{f.metric} ({f.requiredChange}):</strong> {f.description}</li>
                ))}
            </ul>

            <h2 className="text-lg font-bold border-b pb-1 mb-3">3. Recommended Actions & Scenarios</h2>
            {canvas.scenarios.map((action, i) => (
                <div key={i} className="mb-6">
                    <h3 className="font-semibold text-md">{i + 1}. {action.actionName} (Confidence: {action.confidenceScore}%)</h3>
                    <p className="text-sm text-slate-600 mb-3">{action.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {action.scenarios.map((s, j) => (
                            <div key={j} className="border p-3 rounded bg-slate-50 break-inside-avoid">
                                <h4 className="font-bold text-sm mb-1">{s.label} ({s.estimatedCost})</h4>
                                <p className="text-xs text-slate-500 mb-2">Timeline: {s.timeline} | Lift: {s.expectedKpiLift}</p>
                                <ol className="list-decimal pl-4 text-xs">
                                    {s.executionPlan.map((step, k) => (
                                        <li key={k} className="mb-1">{step}</li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            
            {canvas.locationSplits && canvas.locationSplits.length > 0 && canvas.locationSplits[0].locationName !== 'Global' && (
                <>
                    <h2 className="text-lg font-bold border-b pb-1 mb-3 break-before-page">4. Location Strategy</h2>
                    <div className="grid grid-cols-1 gap-2 mb-6">
                        {canvas.locationSplits.map((loc, i) => (
                            <div key={i} className="border p-3 rounded break-inside-avoid">
                                <strong className="block mb-1">{loc.locationName} - {loc.performanceTier} Tier</strong>
                                <span className="text-sm">Target: {loc.adjustedGoal}</span>
                                <p className="text-xs text-slate-600 mt-1">{loc.tierReason}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Strategy Canvas ──────────────────────────────────────────────────────────
`;

code = code.replace('// ─── Strategy Canvas ──────────────────────────────────────────────────────────', docViewCode);

const oldCanvasStart = 'function StrategyCanvasView({ canvas, onReset }: { canvas: StrategyCanvas; onReset: () => void }) {';
const newCanvasStart = `function StrategyCanvasView({ canvas, onReset, onRefine, onViewDoc }: { canvas: StrategyCanvas; onReset: () => void; onRefine: (m: string) => void; onViewDoc: () => void; }) {
    const [refineMsg, setRefineMsg] = useState('');`;
code = code.replace(oldCanvasStart, newCanvasStart);

const oldCanvasEndBtn = `<button className="goal-reset-btn" onClick={onReset}>
                <span className="material-symbols-outlined text-sm">add_circle</span>
                New Goal
            </button>`;

const newCanvasEndBtn = `</div>
            
            <div className="border-t p-4 bg-slate-50 rounded-b-xl flex flex-col gap-3 shrink-0">
                <div className="flex justify-between items-center gap-2">
                    <button className="flex-1 border bg-white rounded py-1.5 text-sm font-medium hover:bg-slate-100 flex items-center justify-center gap-1 text-slate-700" onClick={onViewDoc}>
                        <span className="material-symbols-outlined text-sm">description</span> View Doc
                    </button>
                    <button className="flex-1 border border-violet-200 bg-violet-50 text-violet-700 rounded py-1.5 text-sm font-medium hover:bg-violet-100 flex items-center justify-center gap-1" onClick={onReset}>
                        <span className="material-symbols-outlined text-sm">add</span> New Goal
                    </button>
                </div>
                <div className="flex items-center bg-white border rounded-full px-3 py-1 shadow-inner">
                    <input 
                        type="text" 
                        className="flex-1 bg-transparent border-none text-sm focus:ring-0 focus:outline-none py-1"
                        placeholder="Refine strategy (e.g. 'Make it low budget')" 
                        value={refineMsg}
                        onChange={e => setRefineMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && refineMsg.trim()) { onRefine(refineMsg); setRefineMsg(''); } }}
                    />
                    <button 
                        className="text-violet-600 hover:text-violet-800 disabled:opacity-50"
                        disabled={!refineMsg.trim()}
                        onClick={() => { onRefine(refineMsg); setRefineMsg(''); }}
                    >
                        <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                </div>
            </div>`;

code = code.replace(oldCanvasEndBtn, newCanvasEndBtn);

code = code.replace('<div className="goal-canvas">', '<div className="goal-canvas" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: 0 }}>\n            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>');

code = code.replace('const [historyOpen, setHistoryOpen] = useState(false);', `const [historyOpen, setHistoryOpen] = useState(false);
    const [isDocView, setIsDocView] = useState(false);`);

const handleSubOld = 'const handleSubmit = useCallback(async () => {';
const handleSubNew = `const handleSubmit = useCallback(async (customQuery?: string | React.MouseEvent<HTMLButtonElement>) => {
        const q = typeof customQuery === 'string' ? customQuery.trim() : input.trim();`;
code = code.replace(handleSubOld, handleSubNew);

code = code.replace('const q = input.trim();', '');

code = code.replace('onClick={handleSubmit}', 'onClick={() => handleSubmit()}');
// also replace <button className="ask-ai-retry-btn" onClick={handleSubmit}>
code = code.replace('<button className="ask-ai-retry-btn" onClick={handleSubmit}>', '<button className="ask-ai-retry-btn" onClick={() => handleSubmit()}>');


const renderCanvasOld = `{canvas && !loading && (
                        <StrategyCanvasView canvas={canvas} onReset={() => { setCanvas(null); setError(null); }} />
                    )}`;
const renderCanvasNew = `{canvas && !loading && !isDocView && (
                        <StrategyCanvasView 
                            canvas={canvas} 
                            onReset={() => { setCanvas(null); setError(null); }} 
                            onRefine={(msg) => handleSubmit(\`\${canvas.goal.targetMetric} - Refine: \${msg}\`)}
                            onViewDoc={() => setIsDocView(true)}
                        />
                    )}
                    {canvas && !loading && isDocView && (
                        <StrategyDocView canvas={canvas} onBack={() => setIsDocView(false)} />
                    )}`;

code = code.replace(renderCanvasOld, renderCanvasNew);

fs.writeFileSync(panelPath, code, 'utf8');
