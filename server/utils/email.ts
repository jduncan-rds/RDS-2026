/**
 * Minimal Resend wrapper. Uses fetch directly to avoid pulling in the SDK
 * for two callsites. If RESEND_API_KEY (or RESEND_FROM_EMAIL) is not set,
 * the helper logs the payload and resolves without sending — same pattern
 * as the ShipStation fulfillment stub. The durable record of contact
 * messages / order events lives elsewhere (logs, Supabase), so a missing
 * key never blocks the user-facing request.
 *
 * Resend requires the `from` address to be on a domain you've verified in
 * the Resend dashboard. In dev, you can use `onboarding@resend.dev`.
 */
export interface EmailMessage {
  to: string
  subject: string
  text: string
  /** Optional reply-to (e.g., the contact form submitter). */
  replyTo?: string
  /** Override the default from-address (RESEND_FROM_EMAIL), e.g. order alerts. */
  from?: string
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey as string | undefined
  const from = message.from || (config.resendFromEmail as string | undefined)

  if (!apiKey || !from) {
    console.warn('[email] Resend not configured — message NOT sent', {
      to: message.to,
      subject: message.subject,
      missing: !apiKey ? 'RESEND_API_KEY' : 'RESEND_FROM_EMAIL',
    })
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[email] Resend send failed', {
      to: message.to,
      status: res.status,
      body,
    })
    throw new Error(`Resend send failed (${res.status})`)
  }
}
