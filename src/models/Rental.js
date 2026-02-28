const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number },
    totalHours: { type: Number },

    // Financials (ALGO)
    rentAmount: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    totalCharged: { type: Number, required: true },

    // Escrow
    escrow: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow' },

    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'RETURNED', 'OVERDUE', 'DISPUTED', 'CANCELLED'],
      default: 'PENDING',
    },

    depositRefunded: { type: Boolean, default: false },
    depositRefundTxId: { type: String },

    notes: { type: String },
    conditionOnReturn: { type: String, enum: ['Good', 'Damaged', 'Lost'] },
  },
  { timestamps: true }
);

rentalSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const ms = this.endDate - this.startDate;
    this.totalHours = Math.ceil(ms / (1000 * 60 * 60));
    this.totalDays = Math.ceil(ms / (1000 * 60 * 60 * 24));
  }
  next();
});

module.exports = mongoose.model('Rental', rentalSchema);
