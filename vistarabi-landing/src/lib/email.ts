// Email utility — sends transactional emails via Resend
// Falls back gracefully if RESEND_API_KEY is not set (dev mode)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'VistaraBI <hello@vistarabi.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vistarabi.com';

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not set — email not sent:', { to, subject });
        return false;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
        });
        return res.ok;
    } catch (err) {
        console.error('[Email] Failed to send:', err);
        return false;
    }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

export function welcomeEmail(name: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <!-- Logo -->
    <div style="text-align:center;padding:32px 0 24px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:20px;">📊</div>
        <span style="font-size:22px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">VistaraBI</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;">
      <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">Welcome, ${name}! 🎉</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:16px;line-height:1.7;">
        Your VistaraBI workspace is ready. Upload your first CSV and watch AI turn it into a full analytics dashboard in under 5 minutes.
      </p>

      <!-- Steps -->
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:16px;padding:24px;margin-bottom:28px;">
        <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:1px;">Your first 3 steps</p>
        ${[
            ['1️⃣', 'Create a Project', 'Give your workspace a name and description'],
            ['2️⃣', 'Upload Your Data', 'Drop in a CSV, Excel, or JSON file'],
            ['3️⃣', 'Explore AI Insights', 'Your dashboard, KPIs, and forecasts generate automatically'],
        ].map(([emoji, title, desc]) => `
        <div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start;">
          <span style="font-size:20px;flex-shrink:0;">${emoji}</span>
          <div>
            <div style="font-weight:700;color:#e2e8f0;margin-bottom:2px;">${title}</div>
            <div style="color:#64748b;font-size:14px;">${desc}</div>
          </div>
        </div>`).join('')}
      </div>

      <a href="${APP_URL}/app" style="display:block;text-align:center;padding:16px 32px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;text-decoration:none;border-radius:14px;font-weight:700;font-size:16px;">
        Open My Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#334155;font-size:13px;margin-top:24px;">
      You're receiving this because you signed up for VistaraBI.<br>
      <a href="${APP_URL}/app/settings" style="color:#6366f1;">Manage preferences</a>
    </p>
  </div>
</body>
</html>`;
}

export function passwordResetEmail(resetUrl: string): string {
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🔒</div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#f8fafc;">Reset your password</h1>
      <p style="color:#94a3b8;margin:0 0 28px;line-height:1.7;">
        Click the button below to reset your password. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;text-decoration:none;border-radius:12px;font-weight:700;">
        Reset Password
      </a>
      <p style="color:#475569;font-size:13px;margin-top:24px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
