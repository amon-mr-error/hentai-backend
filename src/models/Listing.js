const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: ['Electronics', 'Books', 'Lab Gear', 'Clothing', 'Vehicles', 'Other'],
    },
    type: {
      type: String,
      required: true,
      enum: ['sell', 'rent'],
    },
    price: { type: Number, required: true, min: 0 }, // in ALGO
    priceUnit: {
      type: String,
      enum: ['fixed', 'per_hour', 'per_day'],
      default: 'fixed',
    },
    images: [{ type: String }], // IPFS hashes or URLs
    condition: {
      type: String,
      enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
      default: 'Good',
    },
    campus: { type: String, required: true },
    location: { type: String }, // Building/hostel
    tags: [{ type: String }],

    // Availability for rentals
    availability: {
      from: { type: Date },
      to: { type: Date },
      isAvailable: { type: Boolean, default: true },
    },

    status: {
      type: String,
      enum: ['active', 'sold', 'rented', 'inactive', 'deleted'],
      default: 'active',
    },

    // Escrow info
    escrowAppId: { type: Number, default: null },

    // Stats
    views: { type: Number, default: 0 },
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

listingSchema.index({ campus: 1, category: 1, status: 1 });
listingSchema.index({ seller: 1 });
listingSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Listing', listingSchema);
