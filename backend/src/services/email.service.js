const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const dns = require('dns');

// Force IPv4 first resolution
dns.setDefaultResultOrder('ipv4first');

const OAuth2 = google.auth.OAuth2;

/**
 * Send email using Gmail REST API over HTTPS (Port 443).
 * This works 100% on cloud platforms like Render Free Tier where SMTP ports (25, 465, 587) are firewall blocked.
 */
const sendViaGmailApi = async ({ to, subject, text, html }) => {
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: ${process.env.GOOGLE_USER}`,
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    text || html || ''
  ];
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  console.log(`[Gmail REST API] Email sent to ${to}, id: ${res.data.id}`);
  return res.data;
};

// Send email helper
const sendEmail = async (emailOptions) => {
  // If we have Google OAuth credentials, always use the HTTPS REST API on cloud hosts
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      return await sendViaGmailApi(emailOptions);
    } catch (apiErr) {
      console.error('[Gmail REST API Error]:', apiErr.message);
      // Fall through to nodemailer if REST API failed
    }
  }

  // Fallback to Nodemailer SMTP (for local development or environments with open SMTP ports)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_USER,
      pass: process.env.GOOGLE_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const info = await transporter.sendMail(emailOptions);
  console.log(`[SMTP] Email sent to ${emailOptions.to}: ${info.messageId}`);
  return info;
};

module.exports = { sendEmail };
