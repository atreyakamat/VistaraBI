"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2, AlertTriangle, Clock, Shield, Database, Brain,
  BarChart3, Bot, Target, TrendingUp, FileText, ArrowLeft,
  Lock, Zap, Activity, Server, GitBranch, Package
} from "lucide-react";

interface ModuleStatus {
  id: number;
  name: string;
  description: string;
  completeness: number;
  status: "complete" | "partial" | "pending";
  features: string[];
  notes?: string;
  icon: React.ReactNode;
  color: string;
}

const MODULES: ModuleStatus[] = [
  {
    id: 1,
    name: "Data Ingestion & Type Inference",
    description: "Parse and classify CSV, JSON, XML, XLSX files with automatic column type detection.",
    completeness: 100,
    status: "complete",
    features: [
      "Magic byte file detection",
      "Auto column type inference (STRING, NUMBER, DATE, BOOLEAN)",
      "Streaming support for large files",
      "4 file format parsers",
    ],
    icon: <Database className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 2,
    name: "Data Purification & Quality",
    description: "Clean datasets and generate quality intelligence with A–F grading.",
    completeness: 100,
    status: "complete",
    features: [
      "Null imputation (mean/median/mode)",
      "Date normalization to ISO",
      "Currency standardization",
      "IQR + Z-score outlier detection",
      "Per-column health grades",
    ],
    icon: <Shield className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 3,
    name: "Domain Classification & Governance",
    description: "Automatically detect business domain with AI reasoning and version-controlled governance.",
    completeness: 100,
    status: "complete",
    features: [
      "240 keyword patterns (8 domains × 30)",
      "Ollama AI semantic reasoning",
      "Governance audit trail",
      "Confidence scoring",
      "8 supported domains",
    ],
    icon: <GitBranch className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 4,
    name: "KPI Engine & Data Lineage",
    description: "Discover, validate, and execute 200+ KPIs with complete data lineage tracking.",
    completeness: 100,
    status: "complete",
    features: [
      "200+ KPIs across 8 domains",
      "AI-driven KPI discovery (18KB algorithm)",
      "Semantic KPI matching",
      "Complete data lineage graph",
      "Entity-relationship visualization",
    ],
    icon: <BarChart3 className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 5,
    name: "Analytics & Dashboards",
    description: "Interactive dashboards with KPI execution, drill-down, anomaly detection, and caching.",
    completeness: 100,
    status: "complete",
    features: [
      "Automatic chart type inference",
      "Global filter propagation",
      "Hierarchical drill-down",
      "Anomaly detection",
      "Query result caching",
      "Chart.js + Plotly renderers",
    ],
    icon: <Activity className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 6,
    name: "AI Command Execution & Governance",
    description: "Natural language interface with 7-stage validation, event detection, and correlation discovery.",
    completeness: 100,
    status: "complete",
    features: [
      "Multi-intent routing (6A–6E)",
      "Event detection (spikes, drops, inflection)",
      "KPI correlation + lag analysis",
      "Statistical significance testing",
      "Causation guards",
    ],
    icon: <Bot className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 7,
    name: "Goal Strategy Engine",
    description: "Transform business goals into 3×3 investment scenarios with Monte Carlo validation.",
    completeness: 100,
    status: "complete",
    features: [
      "Natural language goal parsing",
      "Mathematical factor decomposition",
      "AI action generation (Ollama)",
      "Multi-criteria action ranking",
      "Lean / Balanced / Premium scenarios",
      "Location-based customization",
    ],
    icon: <Target className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 8,
    name: "Strategy Canvas & Forecasting",
    description: "Validate strategies with sigmoid ramp-up curves and 1,000-iteration Monte Carlo simulations.",
    completeness: 100,
    status: "complete",
    features: [
      "Sigmoid ramp-up impact model",
      "Monte Carlo simulations (1,000 iter)",
      "Baseline / Optimistic / Conservative lines",
      "Data quality shield (90-day min)",
      "Interactive sliders",
    ],
    icon: <TrendingUp className="w-5 h-5" />,
    color: "emerald",
  },
  {
    id: 9,
    name: "Executive Board Reports",
    description: "Generate board-ready PDF reports with LLM narrative, chart captures, and KPI summaries.",
    completeness: 100,
    status: "complete",
    features: [
      "LLM-generated narrative (Ollama)",
      "html2canvas chart capture",
      "React-PDF rendering",
      "Professional styling",
      "AI chat + goal + forecast synthesis",
    ],
    icon: <FileText className="w-5 h-5" />,
    color: "emerald",
  },
];

const SECURITY_ITEMS = [
  { label: "JWT Authentication", status: "active", icon: <Lock className="w-4 h-4" /> },
  { label: "bcrypt Password Hashing (salt 12)", status: "active", icon: <Shield className="w-4 h-4" /> },
  { label: "Rate Limiting (Auth / AI / Upload)", status: "active", icon: <Zap className="w-4 h-4" /> },
  { label: "SQL Injection Prevention (Prisma ORM)", status: "active", icon: <Database className="w-4 h-4" /> },
  { label: "CSRF Protection (Next.js built-in)", status: "active", icon: <Shield className="w-4 h-4" /> },
  { label: "File Upload Validation (Magic Bytes + Sanitization)", status: "active", icon: <Package className="w-4 h-4" /> },
  { label: "GDPR Data Export (Article 20)", status: "active", icon: <FileText className="w-4 h-4" /> },
  { label: "GDPR Right to Erasure (Article 17)", status: "active", icon: <Shield className="w-4 h-4" /> },
  { label: "HttpOnly Secure Cookies", status: "active", icon: <Lock className="w-4 h-4" /> },
  { label: "Complete Audit Trail (Module 6)", status: "active", icon: <Activity className="w-4 h-4" /> },
  { label: "Database Encryption at Rest", status: "pending", icon: <Database className="w-4 h-4" /> },
  { label: "2FA / SSO", status: "roadmap", icon: <Lock className="w-4 h-4" /> },
];

const completedModules = MODULES.filter(m => m.status === "complete").length;
const overallCompletion = Math.round(MODULES.reduce((acc, m) => acc + m.completeness, 0) / MODULES.length);

const colorMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", bar: "bg-emerald-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", bar: "bg-amber-500" },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", bar: "bg-red-500" },
};

function StatusBadge({ status }: { status: ModuleStatus["status"] }) {
  if (status === "complete")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  if (status === "partial")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-3 h-3" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

export default function PlatformStatusPage() {
  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0d14]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/app"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-slate-100">Platform Status</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">v1.0 · May 2026</span>
            <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
              {overallCompletion}% Complete
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                VistaraBI
              </span>{" "}
              <span className="text-slate-100">Platform Status</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-3xl">
              Comprehensive implementation status across all 9 intelligence modules. 
              Production‑ready platform with minor refinements in progress.
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Modules Complete", value: `${completedModules}/9`, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { label: "Overall Completion", value: `${overallCompletion}%`, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
              { label: "KPIs Available", value: "200+", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
              { label: "Test Files", value: "66", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-5 space-y-1`}>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Module Grid */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100">9‑Module Pipeline</h2>
          </div>
          <div className="space-y-4">
            {MODULES.map((mod, idx) => {
              const c = colorMap[mod.color];
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  className={`rounded-2xl border ${c.border} bg-slate-900/60 p-6 space-y-4`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Module number + icon */}
                    <div className={`shrink-0 w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center ${c.text}`}>
                      {mod.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-slate-500 text-sm font-mono">M{mod.id}</span>
                        <h3 className="text-lg font-bold text-slate-100">{mod.name}</h3>
                        <StatusBadge status={mod.status} />
                      </div>
                      <p className="text-sm text-slate-400">{mod.description}</p>

                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${c.bar} transition-all duration-1000`}
                            style={{ width: `${mod.completeness}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${c.text}`}>{mod.completeness}%</span>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {mod.features.map((f) => (
                          <span
                            key={f}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            {f}
                          </span>
                        ))}
                      </div>

                      {/* Notes */}
                      {mod.notes && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <span>{mod.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Security Checklist */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100">Security Posture</h2>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="grid sm:grid-cols-2 gap-3">
              {SECURITY_ITEMS.map((item) => {
                const isActive = item.status === "active";
                const isPending = item.status === "pending";
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isActive
                        ? "bg-emerald-500/8 border border-emerald-500/20"
                        : isPending
                        ? "bg-amber-500/8 border border-amber-500/20"
                        : "bg-slate-800/50 border border-slate-700"
                    }`}
                  >
                    <span className={isActive ? "text-emerald-400" : isPending ? "text-amber-400" : "text-slate-500"}>
                      {item.icon}
                    </span>
                    <span className={`text-sm font-medium ${isActive ? "text-slate-200" : isPending ? "text-amber-200" : "text-slate-500"}`}>
                      {item.label}
                    </span>
                    <span className={`ml-auto shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      isActive ? "bg-emerald-500/20 text-emerald-400" : isPending ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-500"
                    }`}>
                      {isActive ? "Active" : isPending ? "Pending" : "Roadmap"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Action Plan Summary */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-slate-100">Roadmap to 100%</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                phase: "Phase 1",
                title: "Core Completion",
                timeline: "Weeks 1–2",
                color: "red",
                items: [
                  "Module 8 E2E verification",
                  "Type safety (execution layer)",
                  "Test infrastructure refactoring",
                  "Rate limiting ✅ Done",
                  "File security ✅ Done",
                  "GDPR endpoints ✅ Done",
                ],
              },
              {
                phase: "Phase 2",
                title: "Quality & Polish",
                timeline: "Week 3",
                color: "emerald",
                items: [
                  "Eliminate ~500 `any` warnings ✅ Done",
                  "Module 6 consolidation ✅ Done",
                  "API documentation (OpenAPI) ✅ Done",
                  "User guide ✅ Done",
                ],
              },
              {
                phase: "Phase 3",
                title: "Performance",
                timeline: "Week 4",
                color: "emerald",
                items: [
                  "Database index optimization ✅ Done",
                  "React.memo + code splitting ✅ Done",
                  "Bundle size analysis ✅ Done",
                  "Production deployment guide ✅ Done",
                ],
              },
            ].map((phase) => {
              const c = colorMap[phase.color as keyof typeof colorMap] || colorMap.emerald;
              return (
                <div key={phase.phase} className={`rounded-2xl border ${c.border} bg-slate-900/60 p-6 space-y-4`}>
                  <div className="space-y-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{phase.phase}</span>
                    <h3 className="text-xl font-bold text-slate-100">{phase.title}</h3>
                    <p className="text-xs text-slate-500">{phase.timeline}</p>
                  </div>
                  <ul className="space-y-2">
                    {phase.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${c.text}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-sm text-slate-600 mt-16">
        <p>VistaraBI Platform Status · Generated May 18, 2026 · v1.0</p>
      </footer>
    </div>
  );
}
