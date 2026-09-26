import LossDetail from '../modals/LossDetail.js';
import Company from '../modals/Company.js';

// @desc    Get all loss details filtered by company & month
// @route   GET /api/loss-details
// @access  Private
export const getLossDetails = async (req, res, next) => {
  try {
    const { companyId, month, financialYear, cycle } = req.query;
    const filter = {};

    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    if (month && month !== 'all') {
      filter.month = month;
    }
    if (financialYear && financialYear !== 'all') {
      filter.$or = [
        { financialYear: financialYear },
        { financialYear: { $exists: false } },
        { financialYear: '' },
      ];
    }
    if (cycle && cycle !== 'all') {
      filter.$or = [
        { cycle: cycle },
        { cycle: { $exists: false } },
        { cycle: '' },
      ];
    }

    const lossItems = await LossDetail.find(filter)
      .populate('companyId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: lossItems.length,
      data: lossItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create single loss detail record
// @route   POST /api/loss-details
// @access  Private
export const createLossDetail = async (req, res, next) => {
  try {
    const {
      companyId,
      month,
      financialYear,
      cycle,
      trackingId,
      price = 0,
      reason = 'Parcel damage/loss',
      riderName = '',
      status = 'Not Recovered',
      remark,
      ayushRemark,
    } = req.body;

    if (!month) {
      res.status(400);
      throw new Error('Month is required.');
    }

    const rawStat = (status || '').toString().trim().toLowerCase();
    const validStat = (rawStat === 'recovered' || rawStat === 'recover') ? 'Recovered' : 'Not Recovered';

    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const defaultComp = await Company.findOne({ status: 'Active' });
      if (defaultComp) resolvedCompanyId = defaultComp._id;
    }

    const lossItemData = {
      month,
      financialYear: financialYear || '2026-2027',
      cycle: cycle || '',
      trackingId: trackingId || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
      price: Number(price) || 0,
      reason: reason || 'Parcel damage/loss',
      riderName: riderName ? riderName.trim() : '',
      status: validStat,
      remark: (remark ?? ayushRemark ?? '').toString().trim(),
    };
    if (resolvedCompanyId) {
      lossItemData.companyId = resolvedCompanyId;
    }

    const lossItem = new LossDetail(lossItemData);
    const saved = await lossItem.save();
    if (saved.companyId) {
      await saved.populate('companyId', 'name code');
    }

    res.status(201).json({
      success: true,
      message: 'Loss detail entry created',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import CSV/Excel Loss Details (defaults to Not Recovered if empty/missing)
// @route   POST /api/loss-details/bulk-import
// @access  Private
export const bulkImportLossDetails = async (req, res, next) => {
  try {
    const { companyId, month, rows } = req.body;

    if (!month || !Array.isArray(rows) || rows.length === 0) {
      res.status(400);
      throw new Error('Month and array of loss rows are required.');
    }

    // Map company name or code to company ObjectId
    const allCompanies = await Company.find({});
    const companyMap = new Map();
    allCompanies.forEach((c) => {
      companyMap.set(c.name.trim().toLowerCase(), c._id);
      companyMap.set(c.code.trim().toLowerCase(), c._id);
      companyMap.set(c._id.toString(), c._id);
    });

    const defaultCompanyId = companyId || allCompanies.find((c) => c.status === 'Active')?._id || allCompanies[0]?._id;

    const docsToInsert = rows.map((r) => {
      const rawStat = (r.status || '').toString().trim().toLowerCase();
      const validStat = (rawStat === 'recovered' || rawStat === 'recover') ? 'Recovered' : 'Not Recovered';

      const rawComp = (r.company || r.companyName || r.companyId || '').toString().trim().toLowerCase();
      const matchedCompanyId = companyMap.get(rawComp) || r.companyId || defaultCompanyId || null;

      const doc = {
        month,
        trackingId: r.trackingId || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
        price: Number(r.price) || 0,
        reason: r.reason || 'Parcel damage/loss',
        riderName: r.riderName || '',
        status: validStat,
        remark: (r.remark ?? r.ayushRemark ?? '').toString().trim(),
      };
      if (matchedCompanyId) doc.companyId = matchedCompanyId;
      return doc;
    });

    const inserted = await LossDetail.insertMany(docsToInsert);
    const populated = await LossDetail.populate(inserted, { path: 'companyId', select: 'name code' });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} loss records with default 'Not Recovered' status!`,
      count: inserted.length,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single loss detail field or entire record
// @route   PATCH /api/loss-details/:id
// @access  Private
export const updateLossDetail = async (req, res, next) => {
  try {
    const lossItem = await LossDetail.findById(req.params.id);
    if (!lossItem) {
      res.status(404);
      throw new Error('Loss detail entry not found.');
    }

    if (req.body.trackingId !== undefined) lossItem.trackingId = req.body.trackingId;
    if (req.body.price !== undefined) lossItem.price = Number(req.body.price) || 0;
    if (req.body.reason !== undefined) lossItem.reason = req.body.reason;
    if (req.body.riderName !== undefined) lossItem.riderName = req.body.riderName;
    if (req.body.status !== undefined) {
      const rawStat = (req.body.status || '').toString().trim().toLowerCase();
      lossItem.status = (rawStat === 'recovered' || rawStat === 'recover') ? 'Recovered' : 'Not Recovered';
    }
    if (req.body.month !== undefined) lossItem.month = req.body.month;
    if (req.body.companyId !== undefined) lossItem.companyId = req.body.companyId;
    if (req.body.remark !== undefined) lossItem.remark = (req.body.remark || '').trim();
    if (req.body.ayushRemark !== undefined) lossItem.remark = (req.body.ayushRemark || '').trim();

    const updated = await lossItem.save();
    await updated.populate('companyId', 'name code');

    res.json({
      success: true,
      message: 'Loss detail entry updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete loss detail record
// @route   DELETE /api/loss-details/:id
// @access  Private
export const deleteLossDetail = async (req, res, next) => {
  try {
    const lossItem = await LossDetail.findById(req.params.id);
    if (!lossItem) {
      res.status(404);
      throw new Error('Loss detail entry not found.');
    }

    await LossDetail.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Loss detail entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Delete loss detail records
// @route   POST /api/loss-details/bulk-delete
// @access  Private
export const bulkDeleteLossDetails = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('Array of IDs is required for bulk deletion.');
    }

    await LossDetail.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Successfully deleted ${ids.length} loss records.`,
      count: ids.length,
    });
  } catch (error) {
    next(error);
  }
};
