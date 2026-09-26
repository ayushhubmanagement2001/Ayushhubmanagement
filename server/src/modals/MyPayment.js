import mongoose from 'mongoose';

const myPaymentSchema = new mongoose.Schema(
  {
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
    financialYear: {
      type: String,
      default: '',
      index: true,
    },
    cycle: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    loss: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalPayable: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Processing'],
      default: 'Pending',
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save calculation hook: finalPayable = amount - loss
myPaymentSchema.pre('save', function (next) {
  this.finalPayable = (Number(this.amount) || 0) - (Number(this.loss) || 0);
  next();
});

export default mongoose.model('MyPayment', myPaymentSchema);
