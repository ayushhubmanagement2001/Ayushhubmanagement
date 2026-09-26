import mongoose from 'mongoose';

const advanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      index: true,
    },
    month: {
      type: String,
      required: false,
      index: true,
    },
    financialYear: {
      type: String,
      default: '',
      index: true,
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
      trim: true,
    },
    riderName: {
      type: String,
      default: '',
      trim: true,
    },
    riderId: {
      type: String,
      default: '',
      trim: true,
    },
    advance: {
      type: Number,
      default: 0,
      min: 0,
    },
    advanceCut: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
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

// Pre-save hook to calculate remainingAmount = advance - advanceCut
advanceSchema.pre('save', function (next) {
  this.remainingAmount = (Number(this.advance) || 0) - (Number(this.advanceCut) || 0);
  next();
});

export default mongoose.model('Advance', advanceSchema);
