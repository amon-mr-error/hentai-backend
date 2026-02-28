const User = require('../models/User');
const { sendTokenResponse } = require('../services/tokenService');
const { cacheDel } = require('../config/redis');

// @POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, campus, studentId, walletAddress } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, campus, studentId, walletAddress });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated' });
    }

    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @PUT /api/auth/update-profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, phone, walletAddress, campus } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (phone !== undefined) updates.phone = phone;
    if (walletAddress !== undefined) updates.walletAddress = walletAddress;
    if (campus) updates.campus = campus;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    await cacheDel(`user:${req.user._id}`);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is wrong' });
    }

    user.password = newPassword;
    await user.save();
    await cacheDel(`user:${req.user._id}`);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @GET /api/auth/user/:id (public profile)
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: user.toPublicProfile() });
  } catch (error) {
    next(error);
  }
};
