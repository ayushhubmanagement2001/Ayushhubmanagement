import dns from 'dns';
import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force IPv4 DNS lookup order to prevent ENETUNREACH in cloud environments like Render
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignore if not supported
}

// Reload env vars dynamically if needed
const reloadEnv = () => {
  try {
    dotenv.config({ path: path.join(__dirname, '../../.env.local'), override: true });
    dotenv.config({ path: path.join(__dirname, '../../.env.development'), override: true });
    dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });
  } catch (err) {
    // Ignore
  }
};

let cachedTransporter = null;
let cachedTransporterKey = '';

/**
 * Send email using HTTP API (Resend / Brevo) or Nodemailer SMTP fallback.
 * Solves Render Free Tier blocking outbound SMTP ports 25, 465, and 587.
 */
export const sendEmailMessage = async ({
  to,
  subject,
  html,
  text,
  attachments = [],
}) => {
  reloadEnv();

  const recipient = Array.isArray(to) ? to.join(', ') : to;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();

  // =========================================================================
  // 1. HTTP API Method: Resend (Over HTTPS port 443 - NEVER blocked on Render)
  // =========================================================================
  if (resendApiKey) {
    console.log(`[Email Service]: Sending via Resend HTTP API (Port 443) to ${recipient}...`);
    try {
      const formattedAttachments = attachments.map((att) => {
        let contentBase64 = '';
        if (Buffer.isBuffer(att.content)) {
          contentBase64 = att.content.toString('base64');
        } else if (typeof att.content === 'string') {
          contentBase64 = att.content;
        }
        return {
          filename: att.filename,
          content: contentBase64,
        };
      });

      const resendFrom =
        process.env.RESEND_FROM?.trim() ||
        process.env.EMAIL_FROM?.trim() ||
        'Ayush Hub Management <onboarding@resend.dev>';

      const payload = {
        from: resendFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined,
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || JSON.stringify(resData));
      }

      console.log(`[Email Service Success - Resend]: ID ${resData.id}`);
      return {
        success: true,
        messageId: resData.id,
        provider: 'resend',
      };
    } catch (err) {
      console.error('[Email Service Resend Error]:', err.message);
      throw new Error(`Resend email delivery failed: ${err.message}`);
    }
  }

  // =========================================================================
  // 2. HTTP API Method: Brevo (Over HTTPS port 443 - NEVER blocked on Render)
  // =========================================================================
  if (brevoApiKey) {
    console.log(`[Email Service]: Sending via Brevo HTTP API (Port 443) to ${recipient}...`);
    try {
      const formattedAttachments = attachments.map((att) => {
        let contentBase64 = '';
        if (Buffer.isBuffer(att.content)) {
          contentBase64 = att.content.toString('base64');
        } else if (typeof att.content === 'string') {
          contentBase64 = att.content;
        }
        return {
          name: att.filename,
          content: contentBase64,
        };
      });

      const senderEmail = process.env.SMTP_USER || 'roommilega1611@gmail.com';
      const senderName = 'Ayush Hub Management';

      const payload = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        attachment: formattedAttachments.length > 0 ? formattedAttachments : undefined,
      };

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || JSON.stringify(resData));
      }

      console.log(`[Email Service Success - Brevo]: ID ${resData.messageId}`);
      return {
        success: true,
        messageId: resData.messageId,
        provider: 'brevo',
      };
    } catch (err) {
      console.error('[Email Service Brevo Error]:', err.message);
      throw new Error(`Brevo email delivery failed: ${err.message}`);
    }
  }

  // =========================================================================
  // 3. SMTP Method: Nodemailer (Localhost & Paid Cloud Hosting)
  // =========================================================================
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (!smtpUser || !smtpPass) {
    throw new Error(
      'No email credentials configured. Please set RESEND_API_KEY (recommended for Render) or SMTP_USER & SMTP_PASS in your environment.'
    );
  }

  const cleanPass = smtpPass.replace(/\s+/g, '');
  const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const configuredPort = Number(process.env.SMTP_PORT) || 587; // Prefer 587 STARTTLS for better cloud compatibility

  const buildTransporter = (port) => {
    const isSecure = port === 465;
    return nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: isSecure,
      family: 4, // Strict IPv4 to eliminate ENETUNREACH
      auth: {
        user: smtpUser,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
  };

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Ayush Hub Management" <${smtpUser}>`,
    to: recipient,
    subject,
    text,
    html,
    attachments,
  };

  // Attempt delivery (try configured port, fallback to alternate 587/465 port if blocked)
  const portsToTry = configuredPort === 587 ? [587, 465] : [465, 587];
  let lastError = null;

  for (const port of portsToTry) {
    try {
      console.log(`[Email Service]: Trying SMTP on ${smtpHost}:${port} (IPv4)...`);
      const transporter = buildTransporter(port);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service Success - SMTP Port ${port}]: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
        response: info.response,
      };
    } catch (err) {
      console.warn(`[Email Service]: Port ${port} attempt failed: ${err.message}`);
      lastError = err;
    }
  }

  // If all SMTP ports failed, check if this is Render Free Tier blocking SMTP
  const isTimeout =
    lastError?.code === 'ETIMEDOUT' ||
    lastError?.message?.includes('timeout') ||
    lastError?.code === 'ENETUNREACH' ||
    lastError?.message?.includes('ENETUNREACH');

  if (isTimeout && process.env.RENDER) {
    throw new Error(
      'Render Free Tier blocks outbound SMTP traffic on ports 25, 465, and 587. To send emails on Render, add a free RESEND_API_KEY in your Render Dashboard Environment Variables.'
    );
  }

  throw lastError || new Error('Failed to deliver email through SMTP.');
};
