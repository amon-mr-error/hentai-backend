const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Financials (in ALGO)
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    sellerReceives: { type: Number, required: true },

    // Algorand on-chain info
    escrowAppId: { type: Number, default: null },
    escrowAddress: { type: String, default: null },
    lockTxId: { type: String, default: null },   // fund lock tx
    releaseTxId: { type: String, default: null }, // release tx
    refundTxId: { type: String, default: null },  // refund tx

    // State machine: LOCKED → IN_TRANSIT → DELIVERED/DISPUTED/CANCELLED/TIMEOUT_REFUND
    state: {
      type: String,
      enum: [
        'PENDING',
        'LOCKED',
        'IN_TRANSIT',
        'DELIVERED',
        'DISPUTED',
        'RESOLVED',
        'CANCELLED',
        'TIMEOUT_REFUND',
      ],
      default: 'PENDING',
    },

    // Rental specific
    rentalPeriod: {
      from: { type: Date },
      to: { type: Date },
    },
    deposit: { type: Number, default: 0 },

    // Dispute
    disputeRaisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    disputeReason: { type: String },
    disputeResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    disputeResolution: { type: String },
    disputeRaisedAt: { type: Date },

    // Timeout
    escrowExpiresAt: { type: Date },
    autoRefundEligible: { type: Boolean, default: false },

    // Reviews
    buyerRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },
    sellerRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },

    // State history
    stateHistory: [
      {
        state: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],

    notes: { type: String },
  },
  { timestamps: true }
);

escrowSchema.index({ buyer: 1, state: 1 });
escrowSchema.index({ seller: 1, state: 1 });
escrowSchema.index({ state: 1, escrowExpiresAt: 1 });

// Helper: push state change
escrowSchema.methods.transitionState = function (newState, changedBy = null, note = '') {
  this.stateHistory.push({ state: newState, changedBy, note });
  this.state = newState;
};

module.exports = mongoose.model('Escrow', escrowSchema);
