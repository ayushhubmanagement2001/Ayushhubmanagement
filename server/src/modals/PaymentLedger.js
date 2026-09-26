import mongoose from 'mongoose';

const paymentLedgerSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiderPayout',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    riderName: {
      type: String,
      required: true,
    },
    riderId: {
      type: String,
      required: true,
    },
    payout: {
      type: Number,
      default: 0,
    },
    loss: {
      type: Number,
      default: 0,
    },
    advance: {
      type: Number,
      default: 0,
    },
    finalPayout: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Hold'],
      default: 'Pending',
    },
    paymentDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    remark: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('PaymentLedger', paymentLedgerSchema);
