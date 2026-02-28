const User = require('../models/User');
const Listing = require('../models/Listing');
const Escrow = require('../models/Escrow');
const Task = require('../models/Task');
const Rental = require('../models/Rental');
const { processTimeouts } = require('../services/escrowService');
const { cacheGet, cacheSet } = require('../config/redis');

// @GET /api/admin/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const cacheKey = 'admin:dashboard';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    const [totalUsers, totalListings, activeEscrows, escrowVolume, openTasks, activeRentals] =
      await Promise.all([
        User.countDocuments({ isActive: true }),
        Listing.countDocuments({ status: 'active' }),
        Escrow.countDocuments({ state: { $in: ['LOCKED', 'IN_TRANSIT'] } }),
        Escrow.aggregate([
          { $match: { state: { $in: ['DELIVERED', 'RESOLVED'] } } },
          { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$platformFee' } } },
        ]),
        Task.countDocuments({ status: 'OPEN' }),
        Rental.countDocuments({ status: 'ACTIVE' }),
      ]);

    const disputes = await Escrow.countDocuments({ state: 'DISPUTED' });
    const recentUsers = await User.find().sort('-createdAt').limit(5).select('name email campus createdAt');

    const dashboard = {
      stats: {
        totalUsers,
        totalListings,
        activeEscrows,
        totalVolume: escrowVolume[0]?.total || 0,
        platformFees: escrowVolume[0]?.fees || 0,
        openTasks,
        activeRentals,
        disputes,
      },
      recentUsers,
    };
    await cacheSet(cacheKey, dashboard, 60);
    res.json({ success: true, ...dashboard });
  } catch (error) {
    next(error);
  }
};

// @GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, campus } = req.query;
    const query = {};
    if (role) query.role = role;
    if (campus) query.campus = campus;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/admin/users/:id/verify
exports.verifyUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/admin/users/:id/toggle-status
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    next(error);
  }
};

// @GET /api/admin/disputes
exports.getDisputes = async (req, res, next) => {
  try {
    const disputes = await Escrow.find({ state: 'DISPUTED' })
      .populate('listing', 'title')
      .populate('buyer', 'name email reputation')
      .populate('seller', 'name email reputation')
      .sort('-disputeRaisedAt');
    res.json({ success: true, disputes, total: disputes.length });
  } catch (error) {
    next(error);
  }
};

// @POST /api/admin/process-timeouts
exports.processTimeouts = async (req, res, next) => {
  try {
    const count = await processTimeouts();
    res.json({ success: true, message: `Processed ${count} timed-out escrows` });
  } catch (error) {
    next(error);
  }
};

// @GET /api/admin/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [userGrowth, listingsByCategory, escrowsByState, tasksByStatus] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: last30days } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Listing.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Escrow.aggregate([{ $group: { _id: '$state', count: { $sum: 1 }, volume: { $sum: '$amount' } } }]),
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    res.json({ success: true, analytics: { userGrowth, listingsByCategory, escrowsByState, tasksByStatus } });
  } catch (error) {
    next(error);
  }
};
