# Manufacturing Guide for Module 7: Goal Strategy Engine

## 1. Introduction to Prescriptive Manufacturing
In Manufacturing, profitability is determined by efficiency, yield, and equipment uptime. VistaraBI's Module 7 transforms factory floor data (IoT, ERP, supply chain) into actionable strategies. It shifts plant managers from reactive maintenance to proactive, prescriptive production optimization.

## 2. Core Manufacturing Mechanics in Module 7
The Goal Decomposer relies on the ultimate manufacturing metric, Overall Equipment Effectiveness (OEE):
**OEE = Availability × Performance × Quality**

If a plant manager sets a goal like "Increase OEE by 5%", Module 7 mathematically decomposes this to show paths like:
- Reducing planned/unplanned downtime (Availability) OR
- Speeding up cycle times (Performance) OR
- Reducing scrap/rework rates (Quality).

## 3. Top Manufacturing Use Cases & Prompts
Effective natural language goals for Manufacturing in Module 7:

*   "Increase overall equipment effectiveness (OEE) by 8% this quarter."
*   "Reduce scrap rate on Assembly Line B by 15%."
*   "Decrease unplanned machine downtime by 20%."
*   "Improve inventory turnover ratio by 10%."
*   "Reduce raw material waste in the packaging phase by 5%."

## 4. Deep Dive: A Strategy Canvas Example
Let's analyze the input: **"Decrease unplanned machine downtime by 20% this year."**

### Stage 1 & 2: Parsing and Mapping
The engine maps "unplanned machine downtime" to the blueprint KPI: `mfg-unplanned-downtime`.

### Stage 3: Decomposing
To reduce downtime, the engine highlights contributing factors (Availability):
- Shifting from reactive to preventative maintenance.
- Reducing mean time to repair (MTTR).
- Improving spare parts availability.

### Stages 4 & 5: Generation and Ranking
The AI, tuned for industrial engineering, generates and ranks strategies:
1.  **IoT-Driven Predictive Maintenance (Confidence: 94%)**
2.  **Operator-Led Autonomous Maintenance (Confidence: 88%)**
3.  **Optimized Spare Parts Kitting (Confidence: 82%)**

### Stage 6: The Scenarios (Execution Plans)
For "Operator-Led Autonomous Maintenance," Module 7 builds three tiers:

**LEAN (Low Budget, DIY):**
- *Plan:* Create physical, laminated checklists for machine operators to perform basic daily cleaning, lubrication, and visual inspections before shift start.
- *Timeline:* 1-2 weeks.
- *Expected Impact:* 5% downtime reduction.

**BALANCED (Standard Tools):**
- *Plan:* Deploy a tablet-based digital CMMS (Computerized Maintenance Management System) like Fiix or UpKeep. Gamify operator daily checks and instantly route anomalies to maintenance techs.
- *Timeline:* 1-2 months.
- *Expected Impact:* 10-15% downtime reduction.

**PREMIUM (High Investment):**
- *Plan:* Install acoustic and vibration IoT sensors on all critical motors and bearings, feeding data into an AI platform that predicts failures weeks before they happen, automatically ordering spare parts via the ERP.
- *Timeline:* 4-6 months.
- *Expected Impact:* 20-30% downtime reduction.

### Stage 7: Location & Segment Split
- *Legacy Plant (Older Equipment):* Deploy the Balanced digital CMMS strategy to standardize reporting on aging machines.
- *New automated line (High Tech):* Deploy the Premium IoT sensor strategy to maximize ROI on new equipment.

## 5. Domain-Specific AI Considerations
The AI evaluates strategies with an understanding of factory floor realities:
- **CapEx vs OpEx:** Understanding the difference between spending cash on new machines vs. optimizing existing ones.
- **Change Management:** Acknowledging the difficulty of changing unionized or deeply entrenched floor workflows.
- **Supply Chain Lead Times:** Not suggesting strategies that rely on parts that take 6 months to arrive.

## 6. Daily Operations
1. **Shift Handoff Review:** Use Module 5 to review the previous shift's OEE.
2. **Strategy Generation:** If a specific line missed targets, use Module 7 to ask: "Improve yield on Line 4."
3. **Execution Execution:** Integrate the Lean or Balanced strategy into the morning stand-up meeting.

## 7. Conclusion
Module 7 acts as a virtual industrial engineer, helping manufacturing leaders optimize their plants systematically by turning raw machine data into strategic, tier-based action plans.