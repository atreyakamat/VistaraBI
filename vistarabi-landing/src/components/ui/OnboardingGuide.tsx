'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Upload, Brain, BarChart3, Target, X } from 'lucide-react';

interface OnboardingGuideProps {
  userName: string;
  projectCount: number;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Upload,
    title: 'Upload Your Data',
    description: 'Start by creating a project and uploading a CSV, JSON, or XLSX file with your business data.',
    color: '#6366f1',
  },
  {
    icon: Brain,
    title: 'AI Detects Your Domain',
    description: 'VistaraBI automatically identifies your business domain (SaaS, Retail, Finance, etc.) and suggests relevant KPIs.',
    color: '#8b5cf6',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Auto-Generated',
    description: 'A beautiful, interactive dashboard is generated with charts, trend analysis, and anomaly detection.',
    color: '#06b6d4',
  },
  {
    icon: Target,
    title: 'Ask AI & Set Goals',
    description: 'Use natural language to ask questions, forecast trends, and simulate strategic scenarios.',
    color: '#10b981',
  },
];

export function OnboardingGuide({ userName, projectCount, onDismiss }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if user already has projects or has dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem('vistarabi-onboarding-dismissed');
    if (wasDismissed === 'true' || projectCount > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    }
  }, [projectCount]);

  const handleDismiss = () => {
    localStorage.setItem('vistarabi-onboarding-dismissed', 'true');
    setDismissed(true);
    onDismiss();
  };

  if (dismissed) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative bg-gradient-to-br from-[var(--card)] to-[var(--background)] rounded-3xl border-2 border-[var(--accent)]/20 p-8 mb-8 overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5" style={{ background: step.color, filter: 'blur(60px)' }} />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all"
          title="Dismiss onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${step.color}15` }}>
            <span className="text-lg">👋</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Welcome to VistaraBI, {userName}!</h2>
            <p className="text-xs text-[var(--muted)]">Quick setup guide — {currentStep + 1} of {STEPS.length}</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentStep ? 32 : 12,
                background: i <= currentStep ? step.color : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* Current step content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-5"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${step.color}15` }}
          >
            <StepIcon className="w-7 h-7" style={{ color: step.color }} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{step.title}</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{step.description}</p>
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            className={`text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ${currentStep === 0 ? 'invisible' : ''}`}
          >
            ← Previous
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Skip Guide
            </button>
            <button
              onClick={() => isLast ? handleDismiss() : setCurrentStep(currentStep + 1)}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg active:scale-95 flex items-center gap-2"
              style={{ background: step.color }}
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
