const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    studentId: { type: String, trim: true },
    campus: { type: String, required: true, default: 'IIT Delhi' },
    role: {
      type: String,
      enum: ['student', 'admin', 'club'],
      default: 'student',
    },
    walletAddress: { type: String, trim: true, default: null },
    algoBalance: { type: Number, default: 0 },

    // Reputation
    reputation: {
      score: { type: Number, default: 5.0, min: 0, max: 5 },
      totalRatings: { type: Number, default: 0 },
      totalTransactions: { type: Number, default: 0 },
      disputes: { type: Number, default: 0 },
    },

    // Profile
    avatar: { type: String, default: null },
    bio: { type: String, maxlength: 300 },
    phone: { type: String },

    // Status
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Public profile
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    campus: this.campus,
    walletAddress: this.walletAddress,
    reputation: this.reputation,
    avatar: this.avatar,
    bio: this.bio,
    isVerified: this.isVerified,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
