const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'domains');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Dashboard.tsx'));

const importStatement = `import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Tooltip } from 'recharts';`;

const lineChartRegex = /function MiniLineChart\([^)]+\) \{[\s\S]*?return \([\s\S]*?<\/svg>\s*\);\s*\}/;
const newLineChart = `function MiniLineChart({ data, color, height = 48 }: { data: number[]; color: string; height?: number }) {
  const chartData = data.map((val, i) => ({ index: i, value: val }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px', padding: '4px 8px' }} 
            itemStyle={{ color: '#fff', padding: 0 }} 
            labelStyle={{ display: 'none' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}`;

const barChartRegex = /function MiniBarChart\([^)]+\) \{[\s\S]*?return \([\s\S]*?<\/div>\s*\);\s*\}/;
const newBarChart = `function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((val, i) => ({ index: i, value: val }));
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 48 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <Bar dataKey="value" fill={color} isAnimationActive={false} radius={[2, 2, 0, 0]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px', padding: '4px 8px' }} 
            itemStyle={{ color: '#fff', padding: 0 }} 
            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
            labelStyle={{ display: 'none' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let changed = false;

  if (lineChartRegex.test(content)) {
    content = content.replace(lineChartRegex, newLineChart);
    changed = true;
  }
  if (barChartRegex.test(content)) {
    content = content.replace(barChartRegex, newBarChart);
    changed = true;
  }

  if (changed && !content.includes('from \'recharts\'')) {
    // Insert after 'lucide-react' import or the last import
    const importsMatch = content.match(/import .*?;/g);
    if (importsMatch) {
      const lastImport = importsMatch[importsMatch.length - 1];
      content = content.replace(lastImport, lastImport + '\n' + importStatement);
    } else {
      content = importStatement + '\n' + content;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
}
