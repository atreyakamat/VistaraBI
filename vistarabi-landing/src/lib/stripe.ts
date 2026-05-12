import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10' as any, // Use pinned version for stability
  typescript: true,
}) : null;

export const PLAN_LIMITS = {
  STARTER: { projects: 1, fileSizeMb: 5, kpisPerProject: 3 },
  PRO:     { projects: 10, fileSizeMb: 100, kpisPerProject: 999 },
  GROWTH:  { projects: 50, fileSizeMb: 500, kpisPerProject: 999 },
  BUSINESS:{ projects: 999, fileSizeMb: 999, kpisPerProject: 999 },
};
