import Advance from '../modals/Advance.js';

// @desc    Get all advance records filtered by company, month, financialYear
// @route   GET /api/advances
// @access  Private
export const getAdvances = async (req, res, next) => {
  try {
    const { companyId, month, financialYear } = req.query;
    const filter = {};

    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    if (month && month !== 'all') {
      filter.month = month;
    }
    if (financialYear && financialYear !== 'all') {
      filter.financialYear = financialYear;
    }

    const advances = await Advance.find(filter)
      .populate('companyId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: advances.length,
      data: advances,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create single advance record
// @route   POST /api/advances
// @access  Private
export const createAdvance = async (req, res, next) => {
  try {
    const {
      companyId,
      month,
      financialYear = '',
      date,
      riderName,
      riderId = '',
      advance = 0,
      advanceCut = 0,
      remark = '',
    } = req.body;

    if (!riderName) {
      res.status(400);
      throw new Error('Rider Name is required.');
    }

    const numAdvance = Number(advance) || 0;
    const numAdvanceCut = Number(advanceCut) || 0;
    const remainingAmount = numAdvance - numAdvanceCut;

    const advanceDoc = new Advance({
      companyId: companyId || undefined,
      month: month || undefined,
      financialYear: financialYear || undefined,
      date: date || new Date().toISOString().split('T')[0],
      riderName: riderName.trim(),
      riderId: (riderId || '').toString().trim(),
      advance: numAdvance,
      advanceCut: numAdvanceCut,
      remainingAmount,
      remark: (remark || '').toString().trim(),
    });

    const saved = await advanceDoc.save();
    if (saved.companyId) {
      await saved.populate('companyId', 'name code');
    }

    res.status(201).json({
      success: true,
      message: 'Advance record created successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import CSV/Excel Advance Records
// @route   POST /api/advances/bulk-import
// @access  Private
export const bulkImportAdvances = async (req, res, next) => {
  try {
    const { companyId, month, financialYear = '', rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400);
      throw new Error('Array of advance rows is required.');
    }

    const docsToInsert = rows.map((r) => {
      const numAdvance = Number(r.advance || r.Advance || 0) || 0;
      const numAdvanceCut = Number(r.advanceCut || r.AdvanceCut || r['Advacnce Cut'] || r['Advance Cut'] || 0) || 0;
      const computedRemaining = numAdvance - numAdvanceCut;

      return {
        companyId: companyId || undefined,
        month: month || undefined,
        financialYear: financialYear || undefined,
        date: r.date || r.Date || new Date().toISOString().split('T')[0],
        riderName: (r.riderName || r['Rider Name'] || r.rider || '').toString().trim() || 'Rider',
        riderId: (r.riderId || r['Rider ID'] || r.id || '').toString().trim(),
        advance: numAdvance,
        advanceCut: numAdvanceCut,
        remainingAmount: computedRemaining,
        remark: (r.remark || r.Remark || '').toString().trim(),
      };
    });

    const inserted = await Advance.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} advance records!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single advance record
// @route   PATCH /api/advances/:id
// @access  Private
export const updateAdvance = async (req, res, next) => {
  try {
    const advanceDoc = await Advance.findById(req.params.id);
    if (!advanceDoc) {
      res.status(404);
      throw new Error('Advance record not found.');
    }

    if (req.body.date !== undefined) advanceDoc.date = req.body.date;
    if (req.body.riderName !== undefined) advanceDoc.riderName = req.body.riderName.trim();
    if (req.body.riderId !== undefined) advanceDoc.riderId = (req.body.riderId || '').toString().trim();
    if (req.body.advance !== undefined) advanceDoc.advance = Number(req.body.advance) || 0;
    if (req.body.advanceCut !== undefined) advanceDoc.advanceCut = Number(req.body.advanceCut) || 0;
    if (req.body.remark !== undefined) advanceDoc.remark = (req.body.remark || '').toString().trim();
    if (req.body.month !== undefined) advanceDoc.month = req.body.month;
    if (req.body.financialYear !== undefined) advanceDoc.financialYear = req.body.financialYear;
    if (req.body.companyId !== undefined) advanceDoc.companyId = req.body.companyId;

    // Recalculate remaining amount
    advanceDoc.remainingAmount = (Number(advanceDoc.advance) || 0) - (Number(advanceDoc.advanceCut) || 0);

    const updated = await advanceDoc.save();
    if (updated.companyId) {
      await updated.populate('companyId', 'name code');
    }

    res.json({
      success: true,
      message: 'Advance record updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete single advance record
// @route   DELETE /api/advances/:id
// @access  Private
export const deleteAdvance = async (req, res, next) => {
  try {
    const deleted = await Advance.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404);
      throw new Error('Advance record not found.');
    }

    res.json({
      success: true,
      message: 'Advance record deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete advance records by IDs
// @route   POST /api/advances/bulk-delete
// @access  Private
export const bulkDeleteAdvances = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of IDs to delete.');
    }

    const result = await Advance.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} advance records.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get riders with outstanding/remaining advances from previous months
// @route   GET /api/advances/outstanding
// @access  Private
export const getOutstandingAdvances = async (req, res, next) => {
  try {
    const { companyId, month, financialYear } = req.query;

    if (!companyId || companyId === 'all') {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Find all advances for this company
    const query = { companyId };
    const allAdvances = await Advance.find(query).sort({ createdAt: 1 });

    // Separate records in current target month vs other months
    const currentMonthRiderKeys = new Set();
    const priorAdvancesByRider = new Map();

    for (const adv of allAdvances) {
      const riderKey = (adv.riderId || '').toString().trim()
        ? `id_${(adv.riderId || '').toString().trim().toLowerCase()}`
        : `name_${(adv.riderName || '').toString().trim().toLowerCase()}`;

      if (adv.month && adv.month.toLowerCase() === (month || '').toLowerCase()) {
        currentMonthRiderKeys.add(riderKey);
      } else {
        const rem = Number(adv.remainingAmount) !== undefined && !isNaN(Number(adv.remainingAmount))
          ? Number(adv.remainingAmount)
          : (Number(adv.advance || 0) - Number(adv.advanceCut || 0));

        if (!priorAdvancesByRider.has(riderKey)) {
          priorAdvancesByRider.set(riderKey, {
            id: adv._id,
            riderName: adv.riderName,
            riderId: adv.riderId || '',
            previousMonth: adv.month,
            previousFinancialYear: adv.financialYear,
            previousAdvance: Number(adv.advance) || 0,
            previousAdvanceCut: Number(adv.advanceCut) || 0,
            remainingAmount: rem,
            date: adv.date,
            remark: adv.remark || '',
            count: 1,
          });
        } else {
          // Accumulate across multiple advance entries for this rider
          const existing = priorAdvancesByRider.get(riderKey);
          existing.previousAdvance += Number(adv.advance) || 0;
          existing.previousAdvanceCut += Number(adv.advanceCut) || 0;
          existing.remainingAmount += rem;
          existing.previousMonth = adv.month;
          existing.date = adv.date;
          existing.count += 1;
          if (adv.remark && !existing.remark.includes(adv.remark)) {
            existing.remark = `${existing.remark}; ${adv.remark}`;
          }
        }
      }
    }

    // Filter riders who don't have a record in target month and have positive remaining balance
    const outstanding = [];
    for (const [riderKey, data] of priorAdvancesByRider.entries()) {
      if (!currentMonthRiderKeys.has(riderKey) && data.remainingAmount > 0) {
        outstanding.push(data);
      }
    }

    res.json({
      success: true,
      count: outstanding.length,
      data: outstanding,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Carry forward pending advances to the current month
// @route   POST /api/advances/carry-forward
// @access  Private
export const carryForwardAdvances = async (req, res, next) => {
  try {
    const { companyId, month, financialYear = '', records } = req.body;

    if (!companyId || !month) {
      res.status(400);
      throw new Error('Company and target Month are required.');
    }

    let itemsToCarry = [];

    if (Array.isArray(records) && records.length > 0) {
      itemsToCarry = records;
    } else {
      // Auto-fetch outstanding records if not explicitly passed
      const allAdvances = await Advance.find({ companyId }).sort({ createdAt: 1 });
      const currentMonthRiderKeys = new Set();
      const priorAdvancesByRider = new Map();

      for (const adv of allAdvances) {
        const riderKey = (adv.riderId || '').toString().trim()
          ? `id_${(adv.riderId || '').toString().trim().toLowerCase()}`
          : `name_${(adv.riderName || '').toString().trim().toLowerCase()}`;

        if (adv.month && adv.month.toLowerCase() === (month || '').toLowerCase()) {
          currentMonthRiderKeys.add(riderKey);
        } else {
          const rem = Number(adv.remainingAmount) !== undefined && !isNaN(Number(adv.remainingAmount))
            ? Number(adv.remainingAmount)
            : (Number(adv.advance || 0) - Number(adv.advanceCut || 0));

          if (!priorAdvancesByRider.has(riderKey)) {
            priorAdvancesByRider.set(riderKey, {
              riderName: adv.riderName,
              riderId: adv.riderId || '',
              previousMonth: adv.month,
              previousFinancialYear: adv.financialYear,
              remainingAmount: rem,
            });
          } else {
            const existing = priorAdvancesByRider.get(riderKey);
            existing.remainingAmount += rem;
            existing.previousMonth = adv.month;
          }
        }
      }

      for (const [riderKey, data] of priorAdvancesByRider.entries()) {
        if (!currentMonthRiderKeys.has(riderKey) && data.remainingAmount > 0) {
          itemsToCarry.push(data);
        }
      }
    }

    if (itemsToCarry.length === 0) {
      return res.json({
        success: true,
        message: 'No pending advance balances to carry forward.',
        count: 0,
        data: [],
      });
    }

    const docsToInsert = itemsToCarry.map((item) => {
      const remaining = Number(item.remainingAmount) || 0;
      return {
        companyId,
        month,
        financialYear,
        date: new Date().toISOString().split('T')[0],
        riderName: (item.riderName || '').trim() || 'Rider',
        riderId: (item.riderId || '').toString().trim(),
        advance: remaining,
        advanceCut: 0,
        remainingAmount: remaining,
        remark: `Carried forward from ${item.previousMonth || 'previous month'} (Bal: ₹${remaining})`,
      };
    });

    const inserted = await Advance.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully carried forward ${inserted.length} advance record(s) to ${month}!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};
