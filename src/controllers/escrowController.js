const Escrow = require('../models/Escrow');
const escrowService = require('../services/escrowService');
const User = require('../models/User');
const { cacheGet, cacheSet } = require('../config/redis');

// @POST /api/escrow/create
exports.createEscrow = async (req, res, next) => {
  try {
    const { listingId, rentalPeriod } = req.body;
    const escrow = await escrowService.createEscrow({
      listingId,
      buyerId: req.user._id,
      rentalPeriod,
    });
    res.status(201).json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/escrow/:id/lock
exports.lockEscrow = async (req, res, next) => {
  try {
    const { txId } = req.body;
    const escrow = await escrowService.lockEscrow(req.params.id, req.user._id, txId);
    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/escrow/:id/ship
exports.shipOrder = async (req, res, next) => {
  try {
    const escrow = await escrowService.shipOrder(req.params.id, req.user._id);
    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/escrow/:id/confirm-delivery
exports.confirmDelivery = async (req, res, next) => {
  try {
    const escrow = await escrowService.confirmDelivery(req.params.id, req.user._id);
    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/escrow/:id/dispute
exports.raiseDispute = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });
    const escrow = await escrowService.raiseDispute(req.params.id, req.user._id, reason);
    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/escrow/:id/resolve (admin)
exports.resolveDispute = async (req, res, next) => {
  try {
    const { resolution, favourBuyer } = req.body;
    const escrow = await escrowService.resolveDispute(
      req.params.id,
      req.user._id,
      resolution,
      favourBuyer
    );
    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/escrow/:id/cancel
exports.cancelEscrow = async (req, res, next) => {
  try {
    const escrow = await escrowService.cancelEscrow(req.params.id, req.user._id);
    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/escrow/:id/rate
exports.rateTransaction = async (req, res, next) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: 'Score must be between 1-5' });
    }

    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });
    if (escrow.state !== 'DELIVERED' && escrow.state !== 'RESOLVED') {
      return res.status(400).json({ success: false, message: 'Can only rate completed transactions' });
    }

    const isBuyer = escrow.buyer.toString() === req.user._id.toString();
    const isSeller = escrow.seller.toString() === req.user._id.toString();
    if (!isBuyer && !isSeller) return res.status(403).json({ success: false, message: 'Unauthorized' });

    let ratedUserId;
    if (isBuyer && !escrow.buyerRating.score) {
      escrow.buyerRating = { score, comment, ratedAt: new Date() };
      ratedUserId = escrow.seller;
    } else if (isSeller && !escrow.sellerRating.score) {
      escrow.sellerRating = { score, comment, ratedAt: new Date() };
      ratedUserId = escrow.buyer;
    } else {
      return res.status(400).json({ success: false, message: 'Already rated' });
    }

    await escrow.save();

    // Update user reputation
    const ratedUser = await User.findById(ratedUserId);
    const totalRatings = ratedUser.reputation.totalRatings + 1;
    const newScore =
      (ratedUser.reputation.score * ratedUser.reputation.totalRatings + score) / totalRatings;
    await User.findByIdAndUpdate(ratedUserId, {
      'reputation.score': Math.round(newScore * 100) / 100,
      'reputation.totalRatings': totalRatings,
    });

    res.json({ success: true, message: 'Rating submitted', escrow });
  } catch (error) {
    next(error);
  }
};

// @GET /api/escrow/my
exports.getMyEscrows = async (req, res, next) => {
  try {
    const { role = 'buyer', state } = req.query;
    const query = {};
    if (role === 'buyer') query.buyer = req.user._id;
    else query.seller = req.user._id;
    if (state) query.state = state;

    const escrows = await Escrow.find(query)
      .populate('listing', 'title images price type')
      .populate('buyer', 'name reputation')
      .populate('seller', 'name reputation')
      .sort('-createdAt');

    res.json({ success: true, escrows, total: escrows.length });
  } catch (error) {
    next(error);
  }
};

// @GET /api/escrow/:id
exports.getEscrow = async (req, res, next) => {
  try {
    const escrow = await Escrow.findById(req.params.id)
      .populate('listing')
      .populate('buyer', 'name reputation walletAddress')
      .populate('seller', 'name reputation walletAddress')
      .populate('stateHistory.changedBy', 'name');

    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });

    const isParty = [escrow.buyer._id.toString(), escrow.seller._id.toString()].includes(
      req.user._id.toString()
    );
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, escrow });
  } catch (error) {
    next(error);
  }
};

// @GET /api/escrow/stats (admin dashboard)
exports.getEscrowStats = async (req, res, next) => {
  try {
    const cacheKey = 'escrow:stats';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    const stateStats = await Escrow.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 }, volume: { $sum: '$amount' } } },
    ]);

    const totalVolume = await Escrow.aggregate([
      { $match: { state: { $in: ['DELIVERED', 'RESOLVED'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const stats = {
      stateStats,
      totalVolume: totalVolume[0]?.total || 0,
    };
    await cacheSet(cacheKey, stats, 120);
    res.json({ success: true, ...stats });
  } catch (error) {
    next(error);
  }
};
