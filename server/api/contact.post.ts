import { sendEmail } from '../utils/email'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { name, email, message, _honeypot } = body

  // Spam: honeypot field should always be empty
  if (_honeypot) {
    return { ok: true }
  }

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'All fields are required.' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email address.' })
  }

  // Length guards — don't relay novels or anything that'd choke a transport.
  if (name.length > 200 || email.length > 200 || message.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: 'Message is too long.' })
  }

  const to = config.contactEmail as string | undefined
  if (!to) {
    // No destination configured — log so the message isn't lost and respond
    // OK so the user isn't told about our config gap.
    console.warn('[contact form] CONTACT_EMAIL not set — message NOT relayed', { name, email })
    return { ok: true }
  }

  await sendEmail({
    to,
    subject: `New message from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    replyTo: email,
  }).catch((err) => {
    // Don't surface email-provider errors to the visitor. The console + Vercel
    // logs are the durable record for now.
    console.error('[contact form] send failed', err)
  })

  return { ok: true }
})
