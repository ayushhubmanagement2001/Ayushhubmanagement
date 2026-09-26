import MyPayment from '../modals/MyPayment.js';
import Company from '../modals/Company.js';

// @desc    Get all payment payout records filtered by company, month, financialYear
// @route   GET /api/my-payments
// @access  Private
export const getMyPayments = async (req, res, next) => {
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
      filter.financialYear = financialYear;
    }
    if (cycle && cycle !== 'all') {
      filter.cycle = cycle;
    }

    const payments = await MyPayment.find(filter)
      .populate('companyId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create single payment payout record
// @route   POST /api/my-payments
// @access  Private
export const createMyPayment = async (req, res, next) => {
  try {
    const {
      companyId,
      month,
      financialYear = '',
      cycle,
      amount = 0,
      loss = 0,
      status = 'Pending',
      remarks = '',
    } = req.body;

    if (!companyId || !month || !cycle) {
      res.status(400);
      throw new Error('Company, Month, and Cycle are required.');
    }

    // Prevent duplicate cycle creation for same company and month
    const existing = await MyPayment.findOne({
      companyId,
      month,
      cycle: cycle.trim(),
    });

    if (existing) {
      res.status(400);
      throw new Error(`Cycle '${cycle.trim()}' already exists for this company in ${month}.`);
    }

    const numAmount = Number(amount) || 0;
    const numLoss = Number(loss) || 0;
    const finalPayable = numAmount - numLoss;

    const paymentDoc = new MyPayment({
      companyId,
      month,
      financialYear,
      cycle: cycle.trim(),
      amount: numAmount,
      loss: numLoss,
      finalPayable,
      status,
      remarks: (remarks || '').trim(),
    });

    const saved = await paymentDoc.save();
    await saved.populate('companyId', 'name code');

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import CSV/Excel Payment Records
// @route   POST /api/my-payments/bulk-import
// @access  Private
export const bulkImportMyPayments = async (req, res, next) => {
  try {
    const { companyId, month, financialYear = '', rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400);
      throw new Error('Valid array of payment rows is required.');
    }

    // Fetch all active companies to map company name from excel row if present
    const companies = await Company.find({});
    const companyMap = new Map();
    companies.forEach((c) => {
      companyMap.set(c.name.trim().toLowerCase(), c._id);
      companyMap.set(c.code.trim().toLowerCase(), c._id);
    });

    const insertedOrUpdated = [];

    for (const r of rows) {
      const rawComp = (r.company || r.Company || '').toString().trim().toLowerCase();
      const matchedCompanyId = companyMap.get(rawComp) || companyId;
      const targetMonth = r.month || month;
      const targetFY = r.financialYear || financialYear;
      const cycleVal = (r.cycle || r.Cycle || r.Cycel || r.week || r.Week || 'Cycle 1').toString().trim();
      const numAmount = Number(r.amount || r.Amount || 0) || 0;
      const numLoss = Number(r.loss || r.Loss || 0) || 0;
      const finalPayable = numAmount - numLoss;
      const remarks = (r.remarks || r.remark || r.Remark || '').toString().trim();

      // Upsert by companyId, month, cycle so no infinite duplicates are created
      const updatedDoc = await MyPayment.findOneAndUpdate(
        {
          companyId: matchedCompanyId,
          month: targetMonth,
          cycle: cycleVal,
        },
        {
          $set: {
            financialYear: targetFY,
            amount: numAmount,
            loss: numLoss,
            finalPayable,
            status: r.status || 'Pending',
            remarks,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      insertedOrUpdated.push(updatedDoc);
    }

    res.status(201).json({
      success: true,
      message: `Successfully processed ${insertedOrUpdated.length} payment records!`,
      count: insertedOrUpdated.length,
      data: insertedOrUpdated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single payment payout record
// @route   PATCH /api/my-payments/:id
// @access  Private
export const updateMyPayment = async (req, res, next) => {
  try {
    const paymentDoc = await MyPayment.findById(req.params.id);
    if (!paymentDoc) {
      res.status(404);
      throw new Error('Payment record not found.');
    }

    if (req.body.cycle !== undefined) {
      const trimmedCycle = (req.body.cycle || '').trim();
      if (trimmedCycle && trimmedCycle !== paymentDoc.cycle) {
        const existing = await MyPayment.findOne({
          _id: { $ne: req.params.id },
          companyId: req.body.companyId || paymentDoc.companyId,
          month: req.body.month || paymentDoc.month,
          cycle: trimmedCycle,
        });
        if (existing) {
          res.status(400);
          throw new Error(`Cycle '${trimmedCycle}' is already used for this company in this month.`);
        }
      }
      paymentDoc.cycle = req.body.cycle;
    }

    if (req.body.amount !== undefined) paymentDoc.amount = Number(req.body.amount) || 0;
    if (req.body.loss !== undefined) paymentDoc.loss = Number(req.body.loss) || 0;
    if (req.body.status !== undefined) paymentDoc.status = req.body.status;
    if (req.body.remarks !== undefined || req.body.remark !== undefined) {
      paymentDoc.remarks = (req.body.remarks ?? req.body.remark ?? '').toString().trim();
    }
    if (req.body.month !== undefined) paymentDoc.month = req.body.month;
    if (req.body.financialYear !== undefined) paymentDoc.financialYear = req.body.financialYear;
    if (req.body.companyId !== undefined) paymentDoc.companyId = req.body.companyId;

    // Recalculate finalPayable = amount - loss
    paymentDoc.finalPayable = (Number(paymentDoc.amount) || 0) - (Number(paymentDoc.loss) || 0);

    const updated = await paymentDoc.save();
    await updated.populate('companyId', 'name code');

    res.json({
      success: true,
      message: 'Payment record updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete single payment payout record
// @route   DELETE /api/my-payments/:id
// @access  Private
export const deleteMyPayment = async (req, res, next) => {
  try {
    const deleted = await MyPayment.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404);
      throw new Error('Payment record not found.');
    }

    res.json({
      success: true,
      message: 'Payment record deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete payment records by IDs
// @route   POST /api/my-payments/bulk-delete
// @access  Private
export const bulkDeleteMyPayments = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of IDs to delete.');
    }

    const result = await MyPayment.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} payment records.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
