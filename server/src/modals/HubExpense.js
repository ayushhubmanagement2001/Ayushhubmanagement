import mongoose from 'mongoose';

const hubExpenseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      index: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    expenseName: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    remark: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('HubExpense', hubExpenseSchema);
