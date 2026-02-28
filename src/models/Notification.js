const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'ESCROW_CREATED',
        'ESCROW_LOCKED',
        'ORDER_SHIPPED',
        'ORDER_DELIVERED',
        'DISPUTE_RAISED',
        'DISPUTE_RESOLVED',
        'TASK_APPLIED',
        'TASK_ACCEPTED',
        'TASK_COMPLETED',
        'RENTAL_REQUEST',
        'RENTAL_APPROVED',
        'RENTAL_RETURNED',
        'RATING_RECEIVED',
        'GENERAL',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
