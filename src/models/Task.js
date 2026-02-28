const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    poster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    runner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 1000 },
    category: {
      type: String,
      enum: ['Printout', 'Food Pickup', 'Submission', 'Delivery', 'Other'],
      default: 'Other',
    },

    reward: { type: Number, required: true, min: 0 }, // ALGO
    isUrgent: { type: Boolean, default: false },

    // Route
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    campus: { type: String, required: true },

    status: {
      type: String,
      enum: ['OPEN', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'],
      default: 'OPEN',
    },

    // Escrow ref
    escrow: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow', default: null },

    // Deadline
    deadline: { type: Date },

    // Rating
    posterRating: { score: Number, comment: String },
    runnerRating: { score: Number, comment: String },

    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

taskSchema.index({ campus: 1, status: 1 });
taskSchema.index({ poster: 1 });
taskSchema.index({ runner: 1 });

module.exports = mongoose.model('Task', taskSchema);
