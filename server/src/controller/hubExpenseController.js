import HubExpense from '../modals/HubExpense.js';

// @desc    Get all hub expenses filtered by company & month
// @route   GET /api/hub-expenses
// @access  Private
export const getHubExpenses = async (req, res, next) => {
  try {
    const { companyId, month } = req.query;
    const filter = {};

    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    if (month && month !== 'all') {
      filter.month = month;
    }

    const expenses = await HubExpense.find(filter)
      .populate('companyId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create single hub expense
// @route   POST /api/hub-expenses
// @access  Private
export const createHubExpense = async (req, res, next) => {
  try {
    const { companyId, month, expenseName, amount = 0, date, remark, ayushRemark } = req.body;

    if (!month) {
      res.status(400);
      throw new Error('Month is required.');
    }

    const expense = new HubExpense({
      companyId: companyId || undefined,
      month,
      expenseName: expenseName || 'New Expense',
      amount: Number(amount) || 0,
      date: date || new Date().toISOString().split('T')[0],
      remark: (remark ?? ayushRemark ?? '').toString().trim(),
    });

    const saved = await expense.save();
    if (saved.companyId) {
      await saved.populate('companyId', 'name code');
    }

    res.status(201).json({
      success: true,
      message: 'Hub expense record created',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import CSV/Excel Hub Expenses
// @route   POST /api/hub-expenses/bulk-import
// @access  Private
export const bulkImportHubExpenses = async (req, res, next) => {
  try {
    const { companyId, month, rows } = req.body;

    if (!month || !Array.isArray(rows) || rows.length === 0) {
      res.status(400);
      throw new Error('Month and array of expense rows are required.');
    }

    const docsToInsert = rows.map((r, index) => {
      return {
        companyId: companyId || undefined,
        month,
        expenseName: r.expenseName || `Expense ${index + 1}`,
        amount: Number(r.amount) || 0,
        date: r.date || new Date().toISOString().split('T')[0],
        remark: (r.remark ?? r.ayushRemark ?? '').toString().trim(),
      };
    });

    const inserted = await HubExpense.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} expense records!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update hub expense field or record
// @route   PATCH /api/hub-expenses/:id
// @access  Private
export const updateHubExpense = async (req, res, next) => {
  try {
    const expense = await HubExpense.findById(req.params.id);
    if (!expense) {
      res.status(404);
      throw new Error('Hub expense not found.');
    }

    if (req.body.expenseName !== undefined) expense.expenseName = req.body.expenseName;
    if (req.body.amount !== undefined) expense.amount = Number(req.body.amount) || 0;
    if (req.body.date !== undefined) expense.date = req.body.date;
    if (req.body.month !== undefined) expense.month = req.body.month;
    if (req.body.companyId !== undefined) expense.companyId = req.body.companyId;
    if (req.body.remark !== undefined) expense.remark = (req.body.remark || '').trim();
    if (req.body.ayushRemark !== undefined) expense.remark = (req.body.ayushRemark || '').trim();

    const updated = await expense.save();
    if (updated.companyId) {
      await updated.populate('companyId', 'name code');
    }

    res.json({
      success: true,
      message: 'Hub expense updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete hub expense
// @route   DELETE /api/hub-expenses/:id
// @access  Private
export const deleteHubExpense = async (req, res, next) => {
  try {
    const expense = await HubExpense.findById(req.params.id);
    if (!expense) {
      res.status(404);
      throw new Error('Hub expense not found.');
    }

    await HubExpense.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Hub expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Delete hub expenses
// @route   POST /api/hub-expenses/bulk-delete
// @access  Private
export const bulkDeleteHubExpenses = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('Array of IDs is required for bulk deletion.');
    }

    await HubExpense.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Successfully deleted ${ids.length} expense records.`,
      count: ids.length,
    });
  } catch (error) {
    next(error);
  }
};
