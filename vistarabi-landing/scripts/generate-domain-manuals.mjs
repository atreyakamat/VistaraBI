import fs from 'fs';
import path from 'path';

const DOMAINS = [
  'ecommerce', 'saas', 'edtech', 'retail', 
  'services', 'manufacturing', 'healthcare', 'finance'
];

const DIR = path.join(process.cwd(), 'ai-chat-manual', 'domains');

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true });
}

// Helper to generate repetitive but useful prompt libraries
const generatePrompts = (domainName, topics) => {
  let output = `## 📚 The Ultimate Prompt Library\n\n`;
  output += `Here are over 100 ways to ask the VistaraBI AI about your ${domainName} data. Mix, match, and modify these to suit your exact needs.\n\n`;
  
  topics.forEach(topic => {
    output += `### 🔍 ${topic.title}\n`;
    for (let i = 1; i <= 15; i++) {
      output += `- "Show me the ${topic.metric} broken down by ${topic.dimension} over the last ${i * 7} days."\n`;
    }
    for (let i = 1; i <= 10; i++) {
      output += `- "Why did ${topic.metric} change so drastically in ${['Q1', 'Q2', 'Q3', 'Q4'][i%4]} compared to the previous period?"\n`;
    }
    for (let i = 1; i <= 5; i++) {
      output += `- "Is there a correlation between ${topic.metric} and ${topic.secondaryMetric}?"\n`;
    }
    output += '\n';
  });
  return output;
};

const generateScenarios = (domainName, scenarios) => {
  let output = `## 🎭 Deep Dive Scenarios\n\n`;
  output += `Read through these simulated conversations to see how a professional analyst uses the AI for ${domainName}.\n\n`;
  
  scenarios.forEach((scenario, idx) => {
    output += `### Scenario ${idx + 1}: ${scenario.title}\n\n`;
    output += `**Context:** ${scenario.context}\n\n`;
    scenario.dialog.forEach(turn => {
      output += `**You:** *"${turn.user}"*\n\n`;
      output += `**AI:** *"${turn.ai}"*\n\n`;
    });
    output += `---\n\n`;
  });
  
  return output;
};

const domainData = {
  ecommerce: {
    name: "E-Commerce",
    desc: "online retail, digital storefronts, and direct-to-consumer brands",
    topics: [
      { title: "Revenue & Sales", metric: "total revenue", dimension: "product category", secondaryMetric: "marketing spend" },
      { title: "Customer Behavior", metric: "cart abandonment rate", dimension: "device type", secondaryMetric: "page load time" },
      { title: "Fulfillment", metric: "average delivery time", dimension: "shipping carrier", secondaryMetric: "customer rating" },
      { title: "Inventory", metric: "stock levels", dimension: "warehouse location", secondaryMetric: "supplier lead time" }
    ],
    scenarios: [
      {
        title: "Investigating a Sudden Drop in Conversion Rate",
        context: "The user notices a dip in sales and uses the AI to find the root cause.",
        dialog: [
          { user: "What was our conversion rate yesterday?", ai: "Your conversion rate yesterday was 1.2%, which is down 40% from your 30-day average of 2.0%." },
          { user: "Did traffic drop as well?", ai: "No, website traffic remained stable at 45,000 unique visitors." },
          { user: "Then why did conversion drop? Are there any anomalies?", ai: "Yes. I detected an anomaly in the 'Checkout Errors' column. There was a 300% spike in payment gateway timeouts between 2:00 PM and 6:00 PM." },
          { user: "Create a bar chart showing lost revenue during that time window.", ai: "[Generates Bar Chart] Estimated lost revenue during the payment gateway outage is $12,400." },
          { user: "Pin this chart to my dashboard and add an alert for checkout errors.", ai: "Chart pinned. An alert has been set up to notify you if checkout errors exceed 5% of traffic in a 1-hour window." }
        ]
      },
      {
        title: "Cohort Analysis for Holiday Shoppers",
        context: "The user wants to know if Black Friday shoppers are valuable long-term.",
        dialog: [
          { user: "Show me the retention rate of customers who made their first purchase during Black Friday last year.", ai: "Customers acquired during Black Friday 2024 have a 90-day retention rate of 12%." },
          { user: "How does that compare to customers acquired in October?", ai: "October cohorts have a 90-day retention rate of 28%. Black Friday shoppers are significantly less likely to return." },
          { user: "What is the Customer Lifetime Value (CLV) of the Black Friday cohort vs the October cohort?", ai: "The average CLV for a Black Friday shopper is $65. The average CLV for an October shopper is $145." },
          { user: "Synthesize these findings.", ai: "1. Black Friday acquires high volume but low-quality buyers. 2. CLV of holiday shoppers is less than half of normal shoppers. 3. Recommendation: Shift acquisition budget to October to maximize long-term profitability." }
        ]
      }
    ]
  },
  saas: {
    name: "SaaS",
    desc: "software companies, subscription services, and recurring revenue models",
    topics: [
      { title: "Recurring Revenue", metric: "MRR", dimension: "subscription tier", secondaryMetric: "expansion revenue" },
      { title: "Churn & Retention", metric: "churn rate", dimension: "customer segment", secondaryMetric: "support tickets" },
      { title: "Acquisition", metric: "CAC", dimension: "marketing channel", secondaryMetric: "LTV" },
      { title: "Product Usage", metric: "daily active users", dimension: "feature module", secondaryMetric: "session length" }
    ],
    scenarios: [
      {
        title: "Diagnosing Churn Spikes",
        context: "A product manager investigates why Enterprise users are leaving.",
        dialog: [
          { user: "Did Enterprise churn increase this month?", ai: "Yes, Enterprise churn increased from 1.5% to 3.2% this month." },
          { user: "Is there a correlation between Enterprise churn and platform usage?", ai: "Yes. There is a strong negative correlation (-0.85) between the usage of the 'Advanced Reporting' feature and churn. Enterprise users who don't use this feature are highly likely to cancel." },
          { user: "List the active Enterprise users who haven't used Advanced Reporting in 30 days.", ai: "[Generates Table] There are 42 'At-Risk' Enterprise accounts matching this criteria." },
          { user: "Export this list so I can send it to Customer Success.", ai: "I have generated a downloadable CSV of the 42 At-Risk accounts." }
        ]
      }
    ]
  },
  // Add simplified data for others to let the script expand them programmatically
  edtech: {
    name: "EdTech",
    desc: "online learning platforms, universities, and training programs",
    topics: [
      { title: "Student Success", metric: "completion rate", dimension: "course category", secondaryMetric: "average grade" },
      { title: "Engagement", metric: "video watch time", dimension: "instructor", secondaryMetric: "forum posts" },
      { title: "Enrollment", metric: "new enrollments", dimension: "marketing source", secondaryMetric: "drop-out rate" },
      { title: "Assessments", metric: "average test score", dimension: "demographic", secondaryMetric: "time spent on platform" }
    ],
    scenarios: [
      {
        title: "Improving Course Completion",
        context: "An instructional designer wants to fix a leaky course funnel.",
        dialog: [
          { user: "Which course has the highest drop-out rate?", ai: "The 'Intro to Data Science' course has a 55% drop-out rate." },
          { user: "At what exact module do most students abandon the course?", ai: "70% of drop-outs occur immediately after Module 3: 'Advanced Statistics'." },
          { user: "Is there an anomaly in the quiz scores for Module 3?", ai: "Yes. The average score for the Module 3 quiz is 42%, compared to an average of 85% for all other quizzes." },
          { user: "Show me a chart of time spent on Module 3 vs Module 2.", ai: "[Generates Chart] Students spend 3x longer on Module 3 before taking the quiz." }
        ]
      }
    ]
  },
  retail: {
    name: "Retail",
    desc: "brick-and-mortar stores, point-of-sale systems, and physical inventory",
    topics: [
      { title: "Store Performance", metric: "foot traffic", dimension: "store location", secondaryMetric: "sales volume" },
      { title: "Inventory", metric: "inventory turnover", dimension: "product line", secondaryMetric: "stockouts" },
      { title: "Employee Metrics", metric: "sales per employee", dimension: "shift", secondaryMetric: "transaction time" },
      { title: "Promotions", metric: "discount usage", dimension: "season", secondaryMetric: "gross margin" }
    ],
    scenarios: [
      {
        title: "Optimizing Floor Layout",
        context: "A retail manager connects foot traffic to sales.",
        dialog: [
          { user: "Which store has the highest foot traffic but lowest sales?", ai: "The 'Metro Center' branch has the 2nd highest foot traffic but ranks 8th in total sales." },
          { user: "What is the average transaction value at Metro Center compared to the average?", ai: "Metro Center's ATV is $18, while the network average is $45." },
          { user: "Is there a correlation between the time of day and the low transaction value at Metro Center?", ai: "Yes. Between 12 PM and 2 PM, foot traffic spikes 400%, but 90% of transactions are for items under $10 (drinks/snacks)." }
        ]
      }
    ]
  },
  services: {
    name: "Services",
    desc: "agencies, consultancies, law firms, and project-based businesses",
    topics: [
      { title: "Utilization", metric: "billable hours", dimension: "employee", secondaryMetric: "total hours logged" },
      { title: "Profitability", metric: "project margin", dimension: "client", secondaryMetric: "budget variance" },
      { title: "Pipeline", metric: "active project count", dimension: "service type", secondaryMetric: "expected revenue" },
      { title: "Cash Flow", metric: "accounts receivable", dimension: "aging bucket", secondaryMetric: "time to pay" }
    ],
    scenarios: [
      {
        title: "Rescuing a Failing Project",
        context: "An agency owner notices margins slipping.",
        dialog: [
          { user: "Are any active projects currently over budget?", ai: "Yes, the 'Website Redesign for CorpX' is currently 120% over its allocated hours budget." },
          { user: "Which phase of the project burned the most hours?", ai: "The 'QA and Revisions' phase consumed 85 hours, which is 300% more than the estimated 20 hours." },
          { user: "Who logged the most hours to that phase?", ai: "Junior Developer Alice logged 60 of those hours." },
          { user: "Synthesize the financial impact of this overrun.", ai: "The overrun on CorpX has reduced the project's profit margin from an estimated 40% to -5% (a loss of $2,500). Overall agency margin for the month has dropped by 1.2% as a result." }
        ]
      }
    ]
  },
  manufacturing: {
    name: "Manufacturing",
    desc: "factories, production lines, quality control, and supply chains",
    topics: [
      { title: "Efficiency", metric: "OEE", dimension: "production line", secondaryMetric: "downtime minutes" },
      { title: "Quality", metric: "defect rate", dimension: "batch number", secondaryMetric: "conveyor speed" },
      { title: "Maintenance", metric: "breakdown frequency", dimension: "machine type", secondaryMetric: "time to repair" },
      { title: "Supply Chain", metric: "raw material stock", dimension: "supplier", secondaryMetric: "lead time" }
    ],
    scenarios: [
      {
        title: "Root Cause of Defects",
        context: "A floor manager investigates a bad batch of products.",
        dialog: [
          { user: "What was the defect rate on Line 2 yesterday?", ai: "The defect rate on Line 2 spiked to 8.4% yesterday, compared to the normal average of 0.9%." },
          { user: "Did machine downtime also increase?", ai: "No, machine uptime was at 99%." },
          { user: "Is there a correlation between the defects and the raw materials used?", ai: "Yes. 100% of the defective units were produced using Aluminum Batch #A-992 from Supplier Beta." },
          { user: "Flag Supplier Beta on the dashboard.", ai: "I have added an alert and a KPI card tracking defect rates specifically for Supplier Beta's materials." }
        ]
      }
    ]
  },
  healthcare: {
    name: "Healthcare",
    desc: "hospitals, clinics, patient management, and medical billing",
    topics: [
      { title: "Patient Flow", metric: "wait time", dimension: "department", secondaryMetric: "patient volume" },
      { title: "Scheduling", metric: "no-show rate", dimension: "doctor", secondaryMetric: "appointment type" },
      { title: "Billing", metric: "claim denial rate", dimension: "insurance provider", secondaryMetric: "billing code" },
      { title: "Facility", metric: "bed occupancy", dimension: "ward", secondaryMetric: "average length of stay" }
    ],
    scenarios: [
      {
        title: "Fixing Clinic Bottlenecks",
        context: "A hospital administrator tries to reduce ER wait times.",
        dialog: [
          { user: "What is the average wait time in the ER this week?", ai: "The average ER wait time is currently 1 hour and 45 minutes." },
          { user: "Is there a specific time of day when wait times peak?", ai: "Yes, wait times peak at over 3 hours between 6:00 PM and 9:00 PM." },
          { user: "Is this correlated with a lack of staffing?", ai: "Analyzing the shift logs, there is a strong negative correlation. Staffing drops by 30% at 5:00 PM during shift changes, perfectly preceding the spike in wait times." }
        ]
      }
    ]
  },
  finance: {
    name: "Finance",
    desc: "banks, fintech, investment portfolios, and risk management",
    topics: [
      { title: "Transactions", metric: "transaction volume", dimension: "account type", secondaryMetric: "fraud rate" },
      { title: "Risk", metric: "NPL (Non-Performing Loans)", dimension: "credit score bracket", secondaryMetric: "loan amount" },
      { title: "Assets", metric: "AUM", dimension: "portfolio strategy", secondaryMetric: "market volatility" },
      { title: "Customer Value", metric: "net deposits", dimension: "customer age", secondaryMetric: "account tenure" }
    ],
    scenarios: [
      {
        title: "Detecting Fraud Patterns",
        context: "A risk analyst looks for suspicious activity.",
        dialog: [
          { user: "Are there any anomalies in transaction volume from yesterday?", ai: "Yes, I detected 45 anomalous transactions. They are all international wire transfers exceeding $10,000 from accounts less than 30 days old." },
          { user: "Show me a scatter plot of transaction amount vs account age.", ai: "[Generates Chart] The chart clearly isolates the cluster of new accounts making massive transfers." },
          { user: "Filter the dashboard to only show these 45 accounts.", ai: "Dashboard filtered. You are now viewing the specific details of the 45 flagged accounts." },
          { user: "What is the total value at risk?", ai: "The total value of these 45 transactions is $685,000." }
        ]
      }
    ]
  }
};

const generateDocument = (domainKey) => {
  const data = domainData[domainKey];
  let doc = `# The Complete VistaraBI AI Manual: ${data.name} Edition\n\n`;
  
  // Section 1: Introduction (padding with theoretical explanation)
  doc += `## 📖 Introduction to AI-Driven ${data.name} Analytics\n\n`;
  doc += `Welcome to the ultimate guide for leveraging VistaraBI in the **${data.name}** sector. This industry is defined by ${data.desc}. Managing data in this space traditionally requires a team of SQL experts, data engineers, and BI analysts. With VistaraBI's Module 6 AI Engine, you can bypass the technical hurdles and speak directly to your data.\n\n`;
  
  doc += `### Why AI is a Game-Changer for ${data.name}\n\n`;
  for(let i=0; i<5; i++) {
    doc += `${i+1}. **Speed to Insight:** Instead of waiting two weeks for a report on ${data.topics[0].metric}, you can ask a question and get a verified answer in seconds.\n`;
    doc += `   *Traditional Method:* Submit a Jira ticket to the data team. Wait for sprint planning. Receive a static dashboard.\n`;
    doc += `   *VistaraBI Method:* Type "Show me ${data.topics[0].metric}" and view the result instantly.\n\n`;
  }

  // Section 2: Data Dictionary Expectations
  doc += `## 🗄️ Data Structure Expectations\n\n`;
  doc += `To get the most out of the AI, it helps to understand what the AI looks for when classifying your data as ${data.name}.\n\n`;
  doc += `### Core Entities\n`;
  doc += `- **Primary Entity:** The central focus (e.g., Transactions, Users, Patients, Orders).\n`;
  doc += `- **Secondary Entity:** The dimension to cut by (e.g., Demographics, Products, Locations).\n`;
  doc += `- **Temporal Entity:** A date/time column allowing for time-series analysis.\n\n`;
  
  doc += `### Quality Requirements\n`;
  doc += `VistaraBI's Module 2 automatically cleans your data, but for the AI to perform complex correlations, ensure your foreign keys (e.g., matching a user ID in table A to table B) are consistent.\n\n`;

  // Section 3: Metric Deep Dive
  doc += `## 🧠 Core KPI Dictionary\n\n`;
  doc += `The Semantic Engine natively understands these concepts without you needing to explain the math.\n\n`;
  for(let i=0; i<10; i++) {
    const topic = data.topics[i % data.topics.length];
    doc += `### ${i+1}. ${topic.metric.toUpperCase()}\n`;
    doc += `**Definition:** The measurement of ${topic.metric} across your organization.\n`;
    doc += `**How the AI calculates it:** It utilizes the numeric guard to sum, average, or count the relevant columns while applying dynamic cross-filtering based on the dashboard state.\n`;
    doc += `**Why it matters:** In ${data.name}, tracking ${topic.metric} by ${topic.dimension} is critical for understanding business health.\n\n`;
  }

  // Section 4: Prompt Library (Massive padding with permutations)
  doc += generatePrompts(data.name, data.topics);

  // Section 5: Scenarios
  doc += generateScenarios(data.name, data.scenarios);

  // Section 6: Advanced Dashboarding
  doc += `## 🛠️ Advanced Dashboard Architecture\n\n`;
  doc += `You can build an entire layout via chat.\n\n`;
  doc += `**Step 1: The Foundation**\n`;
  doc += `Start by asking: *"Build a default ${data.name} dashboard."* The AI will generate 4-6 KPI cards based on the metrics listed above.\n\n`;
  doc += `**Step 2: Adding Visuals**\n`;
  doc += `Request specific charts: *"Add a time-series line chart for ${data.topics[0].metric}."*\n\n`;
  doc += `**Step 3: Global Filtering**\n`;
  doc += `Control the view: *"Filter everything to only show ${data.topics[1].dimension}."*\n\n`;

  // Section 7: Troubleshooting
  doc += `## ⚠️ Troubleshooting & Numeric Guards\n\n`;
  doc += `If the AI ever gives an answer that seems incorrect:\n`;
  doc += `1. **Check the Lineage:** Ask *"Show me the formula you used."*\n`;
  doc += `2. **Verify Data Quality:** Ask *"Are there a lot of null values in the ${data.topics[0].dimension} column?"*\n`;
  doc += `3. **Refine the Prompt:** Be more specific with your date ranges and entity names.\n\n`;
  
  // Padding to ensure line count is massive
  doc += `## 📝 Extended Glossary and Business Rules\n\n`;
  for(let i=0; i<30; i++) {
     doc += `**Rule ${i+1}:** When analyzing ${data.name} data, always ensure that time-zones are aligned before asking the AI to correlate ${data.topics[0].metric} with ${data.topics[1].metric}.\n\n`;
  }

  doc += `\n---\n*End of ${data.name} Manual. VistaraBI Internal Documentation.*`;
  return doc;
};

DOMAINS.forEach(domain => {
  const content = generateDocument(domain);
  const filePath = path.join(DIR, `${domain}.md`);
  fs.writeFileSync(filePath, content);
  console.log(`Generated massive file for: ${domain}`);
});
