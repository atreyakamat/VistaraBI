# Manufacturing AI Chat Guide

Welcome to the Manufacturing playbook for the VistaraBI AI Chat Assistant! If your business involves factories, production lines, raw materials, and quality control, this guide will help you optimize your operations.

## 🏭 How the AI Understands Manufacturing

The AI focuses on maximizing output while minimizing waste and downtime:
- **OEE (Overall Equipment Effectiveness):** The gold standard for measuring manufacturing productivity (Availability x Performance x Quality).
- **Defect Rate / Scrap Rate:** The percentage of manufactured goods that fail quality assurance.
- **Downtime:** The amount of time production lines are stopped due to maintenance, breakage, or shortages.
- **Yield:** The number of acceptable units produced from a specific batch of raw materials.

## 🗣️ Scenario 1: Shift & Production Check-In

Get an instant snapshot of the factory floor.

**You:** *"What was our total production output yesterday?"*
**AI:** *"Yesterday, the factory produced 12,450 units across all lines."*

**You:** *"Compare the efficiency of Shift A versus Shift B."*
**AI:** *"Shift A operated at an average OEE of 82%, while Shift B operated at 76%. Shift B had significantly higher recorded downtime."*

**You:** *"Create a line chart showing machine downtime over the last 30 days."*
**AI:** *[Generates a chart tracking daily downtime minutes]*

## 🕵️ Scenario 2: Quality Control & Root Causes

Quickly isolate the cause of bad batches.

**You:** *"Which production line has the highest defect rate this week?"*
**AI:** *"Production Line 3 has the highest defect rate at 4.2%, which is an anomaly compared to its historical average of 1.1%."*

**You:** *"Is there a correlation between the speed of the conveyor belt and the number of defects on Line 3?"*
**AI:** *"Yes. Analyzing the machine sensor logs against the QA logs shows a very strong positive correlation (0.91). When the belt speed exceeds 45 units/minute, the defect rate sharply increases."*

**You:** *"What raw material batch was used on Line 3 during those defects?"*
**AI:** *"The defective units were predominantly produced using 'Material Batch XYZ-789' from Supplier C."*

## 🎨 Scenario 3: The Floor Manager's Dashboard

**You:** *"Add a KPI card showing our current OEE."*
**AI:** *[Calculates and displays current OEE]*
**You:** *"Create a bar chart showing the most common reasons logged for machine maintenance."*
**AI:** *[Generates a Pareto chart of maintenance codes]*
**You:** *"Filter the dashboard to only show data for the 'Component X' production run."*

## 🚀 Advanced Commands to Try

- **Synthesis:** *"Synthesize the performance of Line 1 for the past month. Focus on bottlenecks."*
- **Supply Chain:** *"Which raw material is closest to stock depletion?"*
- **Energy Efficiency:** *"Are there any anomalies in our electricity or energy usage this month compared to output?"*
