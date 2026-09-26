import mongoose from 'mongoose';

const riderPayoutSchema = new mongoose.Schema(
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
    deliveredPickupTotal: {
      type: Number,
      default: 0,
    },
    delivered: {
      type: Number,
      default: 0,
    },
    pickup: {
      type: Number,
      default: 0,
    },
    primary: {
      type: Number,
      default: 0,
    },
    clubbed: {
      type: Number,
      default: 0,
    },
    rateCard: {
      type: Number,
      default: 12,
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
      enum: ['PAID', 'HOLD', 'PENDING'],
      default: 'PENDING',
    },
    ayushRemark: {
      type: String,
      default: 'Enter remark',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto compute totals on save
riderPayoutSchema.pre('save', function (next) {
  const prim = Number(this.primary) || 0;
  const club = Number(this.clubbed) || 0;
  const deliv = Number(this.delivered) || 0;
  const pick = Number(this.pickup) || 0;
  const rate = Number(this.rateCard) || 12;
  const l = Number(this.loss) || 0;
  const a = Number(this.advance) || 0;

  if (prim > 0 || club > 0) {
    this.deliveredPickupTotal = prim + club;
    this.payout = (prim * rate) + (club * (rate / 2));
  } else if (deliv > 0 || pick > 0) {
    this.deliveredPickupTotal = deliv + pick;
    this.payout = this.deliveredPickupTotal * rate;
  } else {
    this.deliveredPickupTotal = Number(this.deliveredPickupTotal) || 0;
    this.payout = this.deliveredPickupTotal > 0 ? (this.deliveredPickupTotal * rate) : 0;
  }

  this.finalPayout = this.payout - l - a;
  next();
});

export default mongoose.model('RiderPayout', riderPayoutSchema);
