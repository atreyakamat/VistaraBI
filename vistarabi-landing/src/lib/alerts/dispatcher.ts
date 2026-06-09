import { sendEmail } from '@/lib/email';

export interface AlertDetails {
    reason: string;
    deltaPercent: number;
    severity: string;
}

/**
 * Dispatch an anomaly notification over Slack webhooks and Resend email channels.
 */
export async function dispatchAlerts(
    projectId: string,
    kpiName: string,
    details: AlertDetails
): Promise<{ slack: boolean; email: boolean }> {
    let slackSuccess = false;
    let emailSuccess = false;

    try {
        const { default: db } = await import('@/lib/prisma');

        // 1. Fetch project alert settings
        const config = await db.dashboardConfig.findUnique({
            where: { projectId },
            include: { project: true }
        });

        if (!config) return { slack: false, email: false };

        const metadata = (config.metadata || {}) as Record<string, any>;
        const settings = metadata.alertSettings;
        const projectName = config.project.name;

        if (!settings || !settings.enabled) {
            return { slack: false, email: false };
        }

        // Check threshold filter
        const threshold = settings.thresholdPercent ?? 15;
        if (Math.abs(details.deltaPercent) < threshold) {
            console.log(`[Alert Dispatcher] Alert suppressed: Delta ${Math.abs(details.deltaPercent).toFixed(1)}% is below threshold ${threshold}%`);
            return { slack: false, email: false };
        }

        // Throttle to prevent duplicate spams (once every 12 hours for the same KPI)
        const lastSentMap = settings.lastAlertSentAt || {};
        const lastSentStr = lastSentMap[kpiName];
        if (lastSentStr) {
            const timeDiffMs = Date.now() - new Date(lastSentStr).getTime();
            const twelveHoursMs = 12 * 60 * 60 * 1000;
            if (timeDiffMs < twelveHoursMs) {
                console.log(`[Alert Dispatcher] Alert throttled: Already sent for ${kpiName} recently.`);
                return { slack: false, email: false };
            }
        }

        const formattedKpi = kpiName.replace(/_/g, ' ');
        const severityIndicator = details.severity === 'critical' ? '🔴 CRITICAL' : '🟡 WARNING';
        const messageText = `⚠️ [${severityIndicator}] Anomaly detected in ${projectName}: KPI "${formattedKpi}" shifted by ${details.deltaPercent.toFixed(1)}%. Reason: ${details.reason}`;

        // 2. Send Slack webhook alert
        if (settings.slackWebhookUrl) {
            try {
                const response = await fetch(settings.slackWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: messageText,
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `*VistaraBI Anomaly Notification* \n\n*Project*: ${projectName}\n*Status*: \`${severityIndicator}\` \n*KPI*: \`${formattedKpi}\` \n*Shift*: \`${details.deltaPercent.toFixed(1)}%\` \n\n*Justification*: \n> ${details.reason}`
                                }
                            },
                            {
                                type: 'actions',
                                elements: [
                                    {
                                        type: 'button',
                                        text: { type: 'plain_text', text: 'Analyze Dashboard' },
                                        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/projects/${projectId}/dashboard`,
                                        style: 'primary'
                                    }
                                ]
                            }
                        ]
                    })
                });
                slackSuccess = response.ok;
            } catch (slackErr) {
                console.error('[Alert Dispatcher] Slack delivery error:', slackErr);
            }
        }

        // 3. Send Email Alert via Resend client
        if (settings.notificationEmail) {
            const html = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;color:#f1f5f9;min-height:100vh;">
              <div style="max-width:560px;margin:40px auto;padding:24px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;">
                <div style="font-size:32px;margin-bottom:12px;">⚠️</div>
                <h2 style="margin:0 0 4px;font-size:20px;color:#ffffff;">[VistaraBI] Anomaly Alert</h2>
                <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;">Project: ${projectName}</p>
                <div style="background:#ef444415;border:1px solid #ef444430;padding:16px;border-radius:12px;margin-bottom:20px;">
                  <div style="font-size:10px;color:#f87171;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${severityIndicator} Status</div>
                  <div style="font-size:14px;color:#fca5a5;line-height:1.5;">
                    KPI <strong>${formattedKpi}</strong> experienced a <strong>${details.deltaPercent.toFixed(1)}%</strong> shift.
                  </div>
                  <p style="font-size:13px;color:#cbd5e1;margin-top:10px;line-height:1.5;">${details.reason}</p>
                </div>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/projects/${projectId}/dashboard" style="display:block;text-align:center;padding:12px 24px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                  View Live Dashboard →
                </a>
              </div>
            </body>
            </html>
            `;

            emailSuccess = await sendEmail({
                to: settings.notificationEmail,
                subject: `[VistaraBI Alert] ${severityIndicator} - Anomaly in ${formattedKpi}`,
                html
            });
        }

        // 4. Update the last sent timestamp to prevent duplicate fires
        const updatedLastSentMap = {
            ...lastSentMap,
            [kpiName]: new Date().toISOString()
        };

        const updatedMetadata = {
            ...metadata,
            alertSettings: {
                ...settings,
                lastAlertSentAt: updatedLastSentMap
            }
        };

        await db.dashboardConfig.update({
            where: { projectId },
            data: { metadata: updatedMetadata as any }
        });

    } catch (err) {
        console.error('[Alert Dispatcher] Error during execution:', err);
    }

    return { slack: slackSuccess, email: emailSuccess };
}
