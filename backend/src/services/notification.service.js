const notificationModel = require('../models/notification.model');

let sgMail = null;
if (process.env.SENDGRID_API_KEY) {
  sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendEmail({ to, subject, text }) {
  if (!sgMail || !process.env.SENDGRID_FROM_EMAIL) {
    console.log(`[email skipped — SendGrid not configured] would send to ${to}: ${subject}`);
    return false;
  }
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error('SendGrid send failed:', err.message);
    return false;
  }
}

/**
 * Sends a notification to a user. Always records an in-app notification
 * (channel: 'in_app') so it shows up in their dashboard regardless of
 * whether email/SMS delivery is configured yet — the gym should never
 * lose the notification just because SendGrid/Twilio aren't set up.
 */
async function notify({ userId, userEmail, userName, type, subject, message }) {
  await notificationModel.create({ userId, type, channel: 'in_app', message });

  if (userEmail) {
    const sent = await sendEmail({
      to: userEmail,
      subject,
      text: `Hi ${userName || 'there'},\n\n${message}\n\n— Evolve Gym`,
    });
    if (sent) {
      await notificationModel.create({ userId, type, channel: 'email', message });
    }
  }

  // WhatsApp/SMS via Twilio would plug in here the same way, once
  // TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM are set:
  //
  // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({
  //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
  //   to: `whatsapp:${userPhone}`,
  //   body: message,
  // });
  // await notificationModel.create({ userId, type, channel: 'whatsapp', message });
}

module.exports = { notify };
