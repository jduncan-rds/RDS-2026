export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, message, _honeypot } = body

  // Spam: honeypot field should always be empty
  if (_honeypot) {
    return { ok: true }
  }

  // Basic validation
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'All fields are required.' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email address.' })
  }

  // TODO: wire up email delivery (Resend recommended)
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'noreply@yourdomain.com',
  //   to: process.env.CONTACT_EMAIL,
  //   subject: `New message from ${name}`,
  //   text: `From: ${name} <${email}>\n\n${message}`,
  // })

  console.log('[contact form]', { name, email, message })

  return { ok: true }
})
