import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Company code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    icon: {
      type: String,
      default: 'Building2',
    },
    color: {
      type: String,
      default: '#E53935',
    },
    trackRiderDetails: {
      type: Boolean,
      default: true,
    },
    sheetType: {
      type: String,
      enum: ['shadowfax', 'xpressbees', 'valmo', 'standard'],
      default: 'shadowfax',
    },
    riders: [
      {
        riderId: {
          type: String,
          trim: true,
          default: '',
        },
        riderName: {
          type: String,
          trim: true,
          default: '',
        },
        riderCombined: {
          type: String,
          trim: true,
          default: '',
        },
        rate: {
          type: Number,
          default: 0,
        },
        rateCard: {
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
        delivered: {
          type: Number,
          default: 0,
        },
        pickup: {
          type: Number,
          default: 0,
        },
        category: {
          type: String,
          default: '',
        },
        contact: {
          type: String,
          default: '',
        },
      },
    ],
    cycles: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Company', companySchema);
