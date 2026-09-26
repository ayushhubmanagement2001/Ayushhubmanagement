import mongoose from 'mongoose';

const lossDetailSchema = new mongoose.Schema(
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
    financialYear: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    cycle: {
      type: String,
      default: '',
      trim: true,
    },
    trackingId: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    reason: {
      type: String,
      default: 'Parcel damage/loss',
      trim: true,
    },
    riderName: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Recovered', 'Not Recovered'],
      default: 'Not Recovered',
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

export default mongoose.model('LossDetail', lossDetailSchema);
