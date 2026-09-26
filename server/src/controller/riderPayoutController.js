import RiderPayout from '../modals/RiderPayout.js';
import PaymentLedger from '../modals/PaymentLedger.js';
import Company from '../modals/Company.js';
import nodemailer from 'nodemailer';
import XLSX from 'xlsx';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get rider payouts by company & month
// @route   GET /api/rider-payouts
// @access  Private
export const getRiderPayouts = async (req, res, next) => {
  try {
    const { companyId, month } = req.query;
    const filter = {};

    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    if (month && month !== 'all') {
      filter.month = month;
    }

    const payouts = await RiderPayout.find(filter)
      .populate('companyId', 'name code trackRiderDetails sheetType')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payouts.length,
      data: payouts,
    });
  } catch (error) {
    next(error);
  }
};

function parseRiderIdentifier(idInput, nameInput, combinedInput) {
  let riderId = (idInput || '').toString().trim();
  let riderName = (nameInput || '').toString().trim();
  let riderCombined = (combinedInput || '').toString().trim();

  // Strip leading/trailing punctuation/spaces
  riderId = riderId.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
  riderName = riderName.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
  riderCombined = riderCombined.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();

  // If riderId and riderName are already distinct and non-empty
  if (riderId && riderName && !/^\d+$/.test(riderName)) {
    if (!riderCombined) {
      riderCombined = `${riderName} - ${riderId}`;
    }
    return { riderId, riderName, riderCombined };
  }

  // If riderId or riderName is missing, extract from combined or available field
  let raw = (riderCombined || riderName || riderId || '').toString().trim();
  raw = raw.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();

  if (raw) {
    // 1. Digits first, then name: "123456 - Vineet", "123456/Vineet", "123456 Vineet"
    let m = raw.match(/^(\d+)[\s\-_/:|]+(.+)$/);
    if (m) {
      if (!riderId) riderId = m[1].trim();
      if (!riderName) riderName = m[2].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
    } else {
      // 2. Name first, then digits: "Vineet Pancheshwar - 123456", "Vineet / 123456", "Shubham - 789"
      m = raw.match(/^(.+?)[\s\-_/:|]+(\d+)$/);
      if (m) {
        if (!riderId) riderId = m[2].trim();
        if (!riderName) riderName = m[1].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
      } else if (/^\d+$/.test(raw)) {
        if (!riderId) riderId = raw;
      } else {
        if (!riderName) riderName = raw;
      }
    }
  }

  // Clean individual id and name
  if (riderId) riderId = riderId.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
  if (riderName) riderName = riderName.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();

  // If riderName is only digits and riderId is empty, swap
  if (riderName && !riderId && /^\d+$/.test(riderName)) {
    riderId = riderName;
    riderName = '';
  }

  if (!riderCombined) {
    riderCombined = riderName && riderId ? `${riderName} - ${riderId}` : (riderName || riderId || '');
  }

  return { riderId, riderName, riderCombined };
}

function findMatchingRiderInCompany(companyRiders, inputId, inputName) {
  if (!Array.isArray(companyRiders) || companyRiders.length === 0) return null;

  const rawId = (inputId || '').toString().trim().replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '');
  const rawName = (inputName || '').toString().trim().replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '');
  const lowerName = rawName.toLowerCase();

  const digitsFromId = rawId.replace(/\D/g, '');
  const digitsFromName = rawName.replace(/\D/g, '');
  const targetDigits = digitsFromId || digitsFromName;

  const wordsFromName = rawName.replace(/[\d\-_/:|]/g, '').trim().toLowerCase();

  for (const r of companyRiders) {
    const rawR = r.toObject ? r.toObject() : r;
    const parsed = parseRiderIdentifier(rawR.riderId, rawR.riderName, rawR.riderCombined);
    const rId = (parsed.riderId || rawR.riderId || '').toString().trim();
    const rIdDigits = rId.replace(/\D/g, '');
    const rName = (parsed.riderName || rawR.riderName || '').toString().trim();
    const rNameLower = rName.toLowerCase();
    const rComb = (parsed.riderCombined || rawR.riderCombined || '').toString().trim().toLowerCase();

    // 1. Match by digits (e.g. "123456" or "789")
    if (targetDigits && targetDigits.length >= 2) {
      if (rIdDigits === targetDigits || rComb.includes(targetDigits) || rNameLower.includes(targetDigits)) {
        return {
          ...rawR,
          riderId: rId,
          riderName: rName,
          rate: Number(rawR.rate !== undefined ? rawR.rate : (rawR.rateCard !== undefined ? rawR.rateCard : 0)) || 0,
          rateCard: Number(rawR.rateCard !== undefined ? rawR.rateCard : (rawR.rate !== undefined ? rawR.rate : 0)) || 0,
          primary: Number(rawR.primary) || 0,
          clubbed: Number(rawR.clubbed) || 0,
        };
      }
    }

    // 2. Match by Name (e.g. "Shubham" or "Vineet")
    if (wordsFromName && wordsFromName.length >= 2) {
      if (
        rNameLower === wordsFromName ||
        rComb === wordsFromName ||
        rNameLower.includes(wordsFromName) ||
        wordsFromName.includes(rNameLower) ||
        rComb.includes(wordsFromName)
      ) {
        return {
          ...rawR,
          riderId: rId,
          riderName: rName,
          rate: Number(rawR.rate !== undefined ? rawR.rate : (rawR.rateCard !== undefined ? rawR.rateCard : 0)) || 0,
          rateCard: Number(rawR.rateCard !== undefined ? rawR.rateCard : (rawR.rate !== undefined ? rawR.rate : 0)) || 0,
          primary: Number(rawR.primary) || 0,
          clubbed: Number(rawR.clubbed) || 0,
        };
      }
    }

    // 3. Fallback rawName match
    if (lowerName && (rNameLower === lowerName || rComb === lowerName || rId === lowerName)) {
      return {
        ...rawR,
        riderId: rId,
        riderName: rName,
        rate: Number(rawR.rate !== undefined ? rawR.rate : (rawR.rateCard !== undefined ? rawR.rateCard : 0)) || 0,
        rateCard: Number(rawR.rateCard !== undefined ? rawR.rateCard : (rawR.rate !== undefined ? rawR.rate : 0)) || 0,
        primary: Number(rawR.primary) || 0,
        clubbed: Number(rawR.clubbed) || 0,
      };
    }
  }

  return null;
}

// @desc    Create new rider payout row
// @route   POST /api/rider-payouts
// @access  Private
export const createRiderPayout = async (req, res, next) => {
  try {
    const {
      companyId,
      month,
      riderName,
      riderId,
      riderCombined,
      delivered = 0,
      pickup = 0,
      primary = 0,
      clubbed = 0,
      rateCard = 12,
      loss = 0,
      advance = 0,
      paymentStatus = 'PENDING',
      ayushRemark = 'Enter remark',
    } = req.body;

    if (!companyId || !month) {
      res.status(400);
      throw new Error('Company and Month are required.');
    }

    const company = await Company.findById(companyId);
    let parsed = parseRiderIdentifier(riderId, riderName, riderCombined);
    let finalRiderName = parsed.riderName;
    let finalRiderId = parsed.riderId;
    let configuredRate = Number(rateCard) || 0;

    // Smart lookup from Company Settings
    let finalPrimary = Number(primary) || 0;
    let finalClubbed = Number(clubbed) || 0;

    if ((finalRiderName || finalRiderId) && company && company.trackRiderDetails !== false) {
      const match = findMatchingRiderInCompany(company.riders, finalRiderId, finalRiderName);
      if (match) {
        if (!finalRiderId && match.riderId) finalRiderId = match.riderId;
        if (!finalRiderName && match.riderName) finalRiderName = match.riderName;
        if (!configuredRate && (match.rate !== undefined || match.rateCard !== undefined)) {
          configuredRate = Number(match.rate !== undefined && match.rate !== null && Number(match.rate) > 0 ? match.rate : (match.rateCard || 0));
        }
      }

      // Check previous payout history if still missing
      if (finalRiderName && !finalRiderId) {
        const hMatch = await RiderPayout.findOne({
          riderName: { $regex: new RegExp(`^${finalRiderName}$`, 'i') },
        }).sort({ createdAt: -1 });
        if (hMatch && hMatch.riderId) finalRiderId = hMatch.riderId;
        if (!configuredRate && hMatch && hMatch.rateCard) configuredRate = hMatch.rateCard;
      } else if (finalRiderId && !finalRiderName) {
        const hMatch = await RiderPayout.findOne({
          riderId: { $regex: new RegExp(`^${finalRiderId}$`, 'i') },
        }).sort({ createdAt: -1 });
        if (hMatch && hMatch.riderName) finalRiderName = hMatch.riderName;
        if (!configuredRate && hMatch && hMatch.rateCard) configuredRate = hMatch.rateCard;
      }
    }

    const rawStat = (paymentStatus || '').trim().toUpperCase();
    const validStat = ['PAID', 'HOLD', 'PENDING'].includes(rawStat) && rawStat ? rawStat : 'PENDING';

    const finalAdvance = Number(advance) || 0;
    const finalRemark = (ayushRemark || '').toString().trim() || 'Enter remark';

    const payout = new RiderPayout({
      companyId,
      month,
      riderName: finalRiderName,
      riderId: finalRiderId,
      delivered: Number(delivered) || 0,
      pickup: Number(pickup) || 0,
      primary: finalPrimary,
      clubbed: finalClubbed,
      rateCard: configuredRate || 0,
      loss: Number(loss) || 0,
      advance: finalAdvance,
      paymentStatus: validStat,
      ayushRemark: finalRemark,
    });

    const saved = await payout.save();
    await saved.populate('companyId', 'name code trackRiderDetails sheetType riders');

    // If marked PAID, also ensure a PaymentLedger entry exists
    if (saved.paymentStatus === 'PAID') {
      await PaymentLedger.findOneAndUpdate(
        { payoutId: saved._id },
        {
          transactionId: `TXN-${Date.now().toString().slice(-6)}`,
          payoutId: saved._id,
          companyId: saved.companyId,
          month: saved.month,
          riderName: saved.riderName,
          riderId: saved.riderId,
          payout: saved.payout,
          loss: saved.loss,
          advance: saved.advance,
          finalPayout: saved.finalPayout,
          paymentStatus: 'Paid',
          paymentDate: new Date().toISOString().split('T')[0],
          remark: saved.ayushRemark || 'Direct Bank Disbursement',
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Rider payout record created with rate from settings',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import CSV/Excel rider payouts (defaults to PENDING if empty/missing)
// @route   POST /api/rider-payouts/bulk-import
// @access  Private
export const bulkImportRiderPayouts = async (req, res, next) => {
  try {
    const { companyId, month, rows } = req.body;

    if (!companyId || !month || !Array.isArray(rows) || rows.length === 0) {
      res.status(400);
      throw new Error('Valid companyId, month, and array of rider rows are required.');
    }

    const company = await Company.findById(companyId);
    const shouldTrackRiders = company ? company.trackRiderDetails !== false : true;

    const companyRiders = company && Array.isArray(company.riders) ? company.riders : [];

    const docsToInsert = rows.map((r, index) => {
      const rawStat = (r.paymentStatus || '').toString().trim().toUpperCase();
      const validStat = ['PAID', 'HOLD', 'PENDING'].includes(rawStat) && rawStat ? rawStat : 'PENDING';

      // Parse whatever user passed in riderName, riderId, riderCombined, or generic fields
      let { riderId: inputId, riderName: inputName } = parseRiderIdentifier(
        r.riderId,
        r.riderName,
        r.riderCombined || (r.riderName && !r.riderId ? r.riderName : (r.riderId && !r.riderName ? r.riderId : ''))
      );

      let inputRate = Number(r.rateCard) || (Number(r.rate) || 0);
      let inputPrimary = Number(r.primary) || 0;
      let inputClubbed = Number(r.clubbed) || 0;

      // Smart lookup from Settings if company tracks rider details
      if (shouldTrackRiders) {
        const matched = findMatchingRiderInCompany(companyRiders, inputId, inputName);
        if (matched) {
          if (!inputId && matched.riderId) inputId = matched.riderId;
          if (!inputName && matched.riderName) inputName = matched.riderName;
          if (!inputRate) {
            inputRate = Number(matched.rate !== undefined && matched.rate !== null && Number(matched.rate) > 0 ? match.rate : (matched.rateCard || 0));
          }
        }
      }

      if (!inputName && !inputId) {
        inputName = `Rider ${index + 1}`;
        inputId = `${Math.floor(100000 + Math.random() * 900000)}`;
      } else if (!inputName) {
        inputName = `Rider ${inputId}`;
      } else if (!inputId) {
        inputId = `${Math.floor(100000 + Math.random() * 900000)}`;
      }

      if (!inputRate) inputRate = 12;

      const primary = inputPrimary;
      const clubbed = inputClubbed;
      const delivered = Number(r.delivered) || 0;
      const pickup = Number(r.pickup) || 0;
      const rateCard = inputRate;
      const loss = Number(r.loss) || 0;
      const advance = Number(r.advance) || 0;
      const ayushRemark = (r.ayushRemark || '').toString().trim() || 'Enter remark';

      let deliveredPickupTotal = 0;
      let payout = 0;

      if (primary > 0 || clubbed > 0) {
        deliveredPickupTotal = primary + clubbed;
        payout = (primary * rateCard) + (clubbed * (rateCard / 2));
      } else if (delivered > 0 || pickup > 0) {
        deliveredPickupTotal = delivered + pickup;
        payout = deliveredPickupTotal * rateCard;
      } else {
        deliveredPickupTotal = Number(r.deliveredPickupTotal) || (Number(r.total) || 0);
        payout = deliveredPickupTotal > 0 ? (deliveredPickupTotal * rateCard) : 0;
      }

      const finalPayout = payout - loss - advance;

      return {
        companyId,
        month,
        riderName: inputName,
        riderId: inputId,
        deliveredPickupTotal,
        delivered,
        pickup,
        primary,
        clubbed,
        rateCard,
        payout,
        loss,
        advance,
        finalPayout,
        paymentStatus: validStat,
        ayushRemark,
      };
    });

    const inserted = await RiderPayout.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} rider records with formulas and auto-fetched rider details!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single rider payout field or entire row
// @route   PATCH /api/rider-payouts/:id
// @access  Private
export const updateRiderPayout = async (req, res, next) => {
  try {
    const payout = await RiderPayout.findById(req.params.id);
    if (!payout) {
      res.status(404);
      throw new Error('Rider payout record not found.');
    }

    const allowedFields = [
      'riderName',
      'riderId',
      'deliveredPickupTotal',
      'delivered',
      'pickup',
      'primary',
      'clubbed',
      'rateCard',
      'loss',
      'advance',
      'paymentStatus',
      'ayushRemark',
      'month',
      'companyId',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'paymentStatus') {
          const rawStat = (req.body[field] || '').trim().toUpperCase();
          payout[field] = ['PAID', 'HOLD', 'PENDING'].includes(rawStat) && rawStat ? rawStat : 'PENDING';
        } else if (['deliveredPickupTotal', 'delivered', 'pickup', 'primary', 'clubbed', 'rateCard', 'loss', 'advance'].includes(field)) {
          payout[field] = Number(req.body[field]) || 0;
        } else {
          payout[field] = req.body[field];
        }
      }
    });

    const updated = await payout.save();
    await updated.populate('companyId', 'name code trackRiderDetails sheetType');

    // Sync with PaymentLedger if marked PAID
    if (updated.paymentStatus === 'PAID') {
      await PaymentLedger.findOneAndUpdate(
        { payoutId: updated._id },
        {
          transactionId: `TXN-${Date.now().toString().slice(-6)}`,
          payoutId: updated._id,
          companyId: updated.companyId,
          month: updated.month,
          riderName: updated.riderName,
          riderId: updated.riderId,
          payout: updated.payout,
          loss: updated.loss,
          advance: updated.advance,
          finalPayout: updated.finalPayout,
          paymentStatus: 'Paid',
          paymentDate: new Date().toISOString().split('T')[0],
          remark: updated.ayushRemark || 'Direct Bank Disbursement',
        },
        { upsert: true, new: true }
      );
    } else {
      // If status changed from PAID to PENDING or HOLD, remove ledger record
      await PaymentLedger.findOneAndDelete({ payoutId: updated._id });
    }

    res.json({
      success: true,
      message: 'Rider payout updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete rider payout record
// @route   DELETE /api/rider-payouts/:id
// @access  Private
export const deleteRiderPayout = async (req, res, next) => {
  try {
    const payout = await RiderPayout.findById(req.params.id);
    if (!payout) {
      res.status(404);
      throw new Error('Rider payout record not found.');
    }

    await RiderPayout.findByIdAndDelete(req.params.id);
    await PaymentLedger.findOneAndDelete({ payoutId: req.params.id });

    res.json({
      success: true,
      message: 'Rider payout record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Delete rider payouts
// @route   POST /api/rider-payouts/bulk-delete
// @access  Private
export const bulkDeleteRiderPayouts = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('Array of IDs is required for bulk deletion.');
    }

    await RiderPayout.deleteMany({ _id: { $in: ids } });
    await PaymentLedger.deleteMany({ payoutId: { $in: ids } });

    res.json({
      success: true,
      message: `Successfully deleted ${ids.length} rider records.`,
      count: ids.length,
    });
  } catch (error) {
    next(error);
  }
};

// Helper to create email transporter
let cachedTransporter = null;
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

// @desc    Send Payout Export via Email with Excel attachment
// @route   POST /api/rider-payouts/send-email
// @access  Private
export const sendPayoutEmail = async (req, res, next) => {
  try {
    const {
      toEmail = 'vineetpancheshwar1611@gmail.com',
      subject,
      customMessage = '',
      month = 'September',
      companyName = 'Shadowfax',
      headers = [],
      rows = [],
      summary = {},
    } = req.body;

    if (!toEmail) {
      res.status(400);
      throw new Error('Recipient email is required.');
    }

    const emailSubject = subject || `Please find the below data of ${month} ${companyName}`;

    // Generate Excel Buffer using XLSX
    let attachmentBuffer = null;
    let attachmentFilename = `Rider_Payouts_${month.replace(/\s+/g, '_')}_${companyName.replace(/\s+/g, '_')}.xlsx`;

    if (Array.isArray(headers) && headers.length > 0 && Array.isArray(rows)) {
      const wb = XLSX.utils.book_new();
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Payout Details');
      attachmentBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    // Construct Modern, Executive Email HTML Body Matching Portal Branding
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
              <!-- Main Card Container -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                
                <!-- Top Header Brand Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #881337 100%); padding: 30px 32px; text-align: left;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; padding: 5px 12px; background: rgba(225, 29, 72, 0.25); border: 1px solid rgba(244, 63, 94, 0.5); border-radius: 20px; margin-bottom: 10px;">
                            <span style="color: #fda4af; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;">⚡ LOGISTICS LEDGER</span>
                          </div>
                          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                            AYUSH <span style="color: #f43f5e;">HUB</span> MANAGEMENT
                          </h1>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">
                            Logistics Hub • Payout Disbursement Report
                          </p>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 14px; padding: 10px 16px; text-align: right; display: inline-block; backdrop-filter: blur(4px);">
                            <div style="font-size: 10px; color: #cbd5e1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Company</div>
                            <div style="font-size: 14px; color: #ffffff; font-weight: 900; margin-top: 2px;">${companyName}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Context Sub-Bar (Period & Status Pill) -->
                <tr>
                  <td style="background-color: #fff1f2; border-bottom: 1px solid #ffe4e6; padding: 12px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 13px; color: #9f1239; font-weight: 700;">
                          📅 Period: <span style="color: #e11d48; font-weight: 800;">${month}</span>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; background-color: #ffe4e6; color: #be123c; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; border: 1px solid #fecdd3;">
                            ✓ Verified Ledger
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 28px 32px;">
                    
                    <!-- Greeting & Notes -->
                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                      Hello,<br/><br/>
                      ${customMessage ? `<div style="background: #f8fafc; border-left: 4px solid #e11d48; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 16px; font-size: 13px; color: #475569;">${customMessage}</div>` : ''}
                      Please find below the summary and attached Excel breakdown for <strong>${companyName}</strong> (${month}).
                    </p>

                    <!-- Metric Stat Cards Grid -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0 24px 0;">
                      <tr>
                        <td width="48%" style="vertical-align: top;">
                          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
                            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">👥 Total Riders</div>
                            <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px;">
                              ${summary.totalRiders || rows.length}
                            </div>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Active entries</div>
                          </div>
                        </td>
                        <td width="4%"></td>
                        <td width="48%" style="vertical-align: top;">
                          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
                            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">📦 Total Orders / Run</div>
                            <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px;">
                              ${summary.totalRuns || 0}
                            </div>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Completed runs</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="3" style="height: 12px;"></td>
                      </tr>
                      <tr>
                        <td width="48%" style="vertical-align: top;">
                          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 14px 16px;">
                            <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">💰 Gross Payout</div>
                            <div style="font-size: 22px; font-weight: 900; color: #1e40af; margin-top: 4px;">
                              ₹${(summary.grossPayout || 0).toLocaleString('en-IN')}
                            </div>
                            <div style="font-size: 11px; color: #3b82f6; margin-top: 2px;">Calculated payout</div>
                          </div>
                        </td>
                        <td width="4%"></td>
                        <td width="48%" style="vertical-align: top;">
                          <div style="background: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 14px; padding: 14px 16px;">
                            <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">✨ Net Final Payable</div>
                            <div style="font-size: 24px; font-weight: 900; color: #065f46; margin-top: 4px;">
                              ₹${(summary.finalPayout || 0).toLocaleString('en-IN')}
                            </div>
                            <div style="font-size: 11px; color: #059669; font-weight: 700; margin-top: 2px;">Disbursement amount</div>
                          </div>
                        </td>
                      </tr>
                    </table>

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
                              ${attachmentFilename}
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                              Complete line-by-line Excel breakdown attached below
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
                      Generated automatically via Ayush Hub Management
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

    const { transporter } = await createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Ayush Hub Management" <${process.env.SMTP_USER || 'roommilega1611@gmail.com'}>`,
      to: toEmail,
      subject: emailSubject,
      text: `Ayush Hub Management - Rider Payout Report for ${companyName} (${month})\n\nPlease find the attached official Excel breakdown.\n${customMessage ? `\nNotes: ${customMessage}\n` : ''}\nRegards,\nAyush Hub Management`,
      html: htmlBody,
      attachments: attachmentBuffer
        ? [
            {
              filename: attachmentFilename,
              content: attachmentBuffer,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ]
        : [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Payout Email Sent to ${toEmail}]:`, info.messageId, info.response);

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }

    res.json({
      success: true,
      message: `Rider payout report email successfully sent to ${toEmail}!`,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    });
  } catch (error) {
    next(error);
  }
};


