import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import crypto from 'crypto';

// POST /api/auth/forgot-password
// Generates a secure reset token, stores it in DB, returns token in dev or sends email in prod
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
        }

        // Look up user — always return 200 to prevent email enumeration
        const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

        if (user) {
            // Generate secure token (32 bytes = 64 hex chars)
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // Upsert reset token in DB
            await db.passwordResetToken.upsert({
                where: { userId: user.id },
                create: { userId: user.id, token, expiresAt },
                update: { token, expiresAt },
            });

            const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

            // Try to send email if RESEND_API_KEY is configured
            if (process.env.RESEND_API_KEY) {
                try {
                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from: process.env.EMAIL_FROM || 'VistaraBI <no-reply@vistarabi.com>',
                            to: [email],
                            subject: 'Reset your VistaraBI password',
                            html: `
                                <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                                    <h2 style="color: #1a1a2e; font-size: 24px; font-weight: 700; margin-bottom: 8px;">Reset Your Password</h2>
                                    <p style="color: #666; font-size: 15px; margin-bottom: 24px;">
                                        Click the button below to reset your VistaraBI password. This link expires in 1 hour.
                                    </p>
                                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px;">
                                        Reset Password
                                    </a>
                                    <p style="color: #999; font-size: 13px; margin-top: 24px;">
                                        If you didn't request this, you can safely ignore this email.<br/>
                                        Link: ${resetUrl}
                                    </p>
                                </div>
                            `,
                        }),
                    });
                } catch (emailErr) {
                    console.error('[ForgotPassword] Email send failed:', emailErr);
                    // Don't fail the request — token is still stored
                }
            } else {
                // Development: Log the reset URL to console
                console.log(`\n[ForgotPassword] DEV MODE — Reset URL for ${email}:\n${resetUrl}\n`);
            }
        }

        // Always return success (prevents email enumeration)
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[ForgotPassword] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
