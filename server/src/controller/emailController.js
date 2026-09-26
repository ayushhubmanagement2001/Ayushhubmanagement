import XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedTransporter = null;

// Helper to create email transporter with pooling for ultra fast delivery
export const createTransporter = async () => {
  try {
    dotenv.config({ path: path.join(__dirname, '../../.env.local'), override: true });
    dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });
  } catch (err) {
    console.warn('Dotenv dynamic reload warning:', err.message);
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (smtpUser && smtpPass) {
    const cleanPass = smtpPass.replace(/\s+/g, '');
    
    // Return existing pooled transporter if credentials haven't changed
    if (
      cachedTransporter &&
      cachedTransporter._user === smtpUser &&
      cachedTransporter._pass === cleanPass
    ) {
      return { transporter: cachedTransporter, isReal: true };
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: {
        user: smtpUser,
        pass: cleanPass,
      },
    });

    transporter._user = smtpUser;
    transporter._pass = cleanPass;
    cachedTransporter = transporter;

    return {
      transporter,
      isReal: true,
    };
  }

  const configError = new Error(
    'SMTP credentials not found in server/.env.local. Please add your SMTP_USER (your Gmail) and SMTP_PASS (Google 16-character App Password) in server/.env.local to deliver real emails.'
  );
  configError.statusCode = 400;
  throw configError;
};

// @desc    Universal Report Email Sender with Excel Attachment
// @route   POST /api/email/send-report
// @access  Public / Private
export const sendReportEmail = async (req, res, next) => {
  try {
    const {
      toEmail = 'vineetpancheshwar1611@gmail.com',
      subject,
      customMessage = '',
      reportTitle = 'Report Ledger',
      reportType = 'Report',
      sheetName = 'Report Data',
      filename,
      metadata = [], // Array of { label: 'Company', value: 'Shadowfax' }
      summaryCards = [], // Array of { label: 'Total Amount', value: '₹50,000', subtext: '...' }
      headers = [],
      rows = [],
    } = req.body;

    if (!toEmail || !toEmail.trim()) {
      res.status(400);
      throw new Error('Recipient email address is required.');
    }

    const emailSubject = subject || `Ayush Hub Management - ${reportTitle} Export`;

    // 1. Generate Excel Attachment Buffer
    let attachmentBuffer = null;
    const safeFilename =
      (filename && filename.trim())
        ? (filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
        : `${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.xlsx`;

    if (Array.isArray(headers) && headers.length > 0 && Array.isArray(rows)) {
      const wb = XLSX.utils.book_new();
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Auto-calculate column widths
      const colWidths = headers.map((h, i) => {
        let maxLen = (h || '').toString().length;
        for (let r = 0; r < Math.min(rows.length, 50); r++) {
          const val = rows[r] && rows[r][i] !== undefined ? rows[r][i].toString() : '';
          if (val.length > maxLen) maxLen = val.length;
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Report');
      attachmentBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    // 2. Build Metadata Pills HTML
    let metadataPillsHtml = '';
    if (Array.isArray(metadata) && metadata.length > 0) {
      metadataPillsHtml = metadata
        .filter((m) => m && m.value)
        .map(
          (m) =>
            `<span style="display: inline-block; background-color: #fff1f2; color: #9f1239; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; border: 1px solid #fecdd3; margin-right: 6px; margin-bottom: 4px;">
              ${m.label}: <strong style="color: #e11d48;">${m.value}</strong>
            </span>`
        )
        .join('');
    }

    // 3. Build Stat Cards HTML Grid
    let summaryCardsHtml = '';
    if (Array.isArray(summaryCards) && summaryCards.length > 0) {
      const cardItems = summaryCards.map((card) => {
        const isHighlight = card.highlight || card.color === 'emerald';
        const bg = isHighlight ? '#ecfdf5' : '#f8fafc';
        const border = isHighlight ? '1.5px solid #6ee7b7' : '1px solid #e2e8f0';
        const valColor = isHighlight ? '#065f46' : '#0f172a';
        const lblColor = isHighlight ? '#047857' : '#64748b';
        const subColor = isHighlight ? '#059669' : '#94a3b8';

        return `
          <td width="${Math.floor(100 / Math.min(summaryCards.length, 3))}%" style="vertical-align: top; padding: 4px;">
            <div style="background: ${bg}; border: ${border}; border-radius: 14px; padding: 14px 16px;">
              <div style="font-size: 10px; font-weight: 800; color: ${lblColor}; text-transform: uppercase; letter-spacing: 0.5px;">${card.label}</div>
              <div style="font-size: 20px; font-weight: 900; color: ${valColor}; margin-top: 4px;">
                ${card.value}
              </div>
              ${card.subtext ? `<div style="font-size: 11px; color: ${subColor}; margin-top: 2px;">${card.subtext}</div>` : ''}
            </div>
          </td>
        `;
      });

      // Split into rows of max 2-3
      summaryCardsHtml = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 18px 0 22px 0;">
          <tr>
            ${cardItems.join('')}
          </tr>
        </table>
      `;
    }

    // 4. Construct Branded Executive HTML Email
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailSubject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
          <tr>
            <td align="center">
              <!-- Main Container -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                
                <!-- Top Brand Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #881337 100%); padding: 30px 32px; text-align: left;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; padding: 4px 12px; background: rgba(225, 29, 72, 0.25); border: 1px solid rgba(244, 63, 94, 0.5); border-radius: 20px; margin-bottom: 10px;">
                            <span style="color: #fda4af; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;">⚡ ${reportType.toUpperCase()}</span>
                          </div>
                          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                            AYUSH <span style="color: #f43f5e;">HUB</span> MANAGEMENT
                          </h1>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">
                            ${reportTitle} • Official Export
                          </p>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 14px; padding: 8px 14px; text-align: right; display: inline-block;">
                            <div style="font-size: 10px; color: #cbd5e1; font-weight: 700; text-transform: uppercase;">Status</div>
                            <div style="font-size: 13px; color: #ffffff; font-weight: 900; margin-top: 2px;">Verified ✓</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Context Sub-Bar -->
                ${metadataPillsHtml ? `
                <tr>
                  <td style="background-color: #fff1f2; border-bottom: 1px solid #ffe4e6; padding: 12px 32px;">
                    <div>${metadataPillsHtml}</div>
                  </td>
                </tr>` : ''}

                <!-- Body Content -->
                <tr>
                  <td style="padding: 28px 32px;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                      Hello,<br/><br/>
                      ${customMessage ? `<div style="background: #f8fafc; border-left: 4px solid #e11d48; padding: 12px 16px; border-radius: 0 10px 10px 0; margin-bottom: 18px; font-size: 13px; color: #475569; line-height: 1.5;">${customMessage}</div>` : ''}
                      Please find below the summary and attached Excel report for <strong>${reportTitle}</strong>.
                    </p>

                    <!-- Metric Stat Cards Grid -->
                    ${summaryCardsHtml}

                    <!-- Attachment Callout Card -->
                    <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 16px; margin-top: 10px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="44" style="vertical-align: middle;">
                            <div style="width: 40px; height: 40px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                              📊
                            </div>
                          </td>
                          <td style="padding-left: 14px; vertical-align: middle;">
                            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
                              ${safeFilename}
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                              Complete Excel report with ${rows.length} records attached
                            </div>
                          </td>
                          <td align="right" style="vertical-align: middle;">
                            <span style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 8px;">
                              Attached 📎
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 32px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; font-weight: 700; color: #475569;">
                      Ayush Hub Management • All Rights Reserved
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8;">
                      Generated automatically via Ayush Hub Portal
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 5. Send Mail
    const { transporter } = await createTransporter();

    const mailOptions = {
      from:
        process.env.EMAIL_FROM ||
        `"Ayush Hub Management" <${process.env.SMTP_USER || 'roommilega1611@gmail.com'}>`,
      to: toEmail,
      subject: emailSubject,
      text: `Ayush Hub Management - ${reportTitle} Report\n\nPeriod / Context: ${metadata?.map(m => `${m.label}: ${m.value}`).join(' | ') || 'Attached'}\n\nPlease find the attached official Excel report breakdown.\n${customMessage ? `\nNotes: ${customMessage}\n` : ''}\nRegards,\nAyush Hub Management`,
      html: htmlBody,
      attachments: attachmentBuffer
        ? [
            {
              filename: safeFilename,
              content: attachmentBuffer,
              contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ]
        : [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent to ${toEmail}]:`, info.messageId, info.response);

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }

    res.json({
      success: true,
      message: `${reportTitle} report email successfully sent to ${toEmail}!`,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    });
  } catch (error) {
    next(error);
  }
};
