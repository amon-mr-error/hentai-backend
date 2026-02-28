const Listing = require('../models/Listing');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

// @GET /api/listings
exports.getListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      type,
      campus,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt',
    } = req.query;

    const query = { status: 'active' };
    if (category) query.category = category;
    if (type) query.type = type;
    if (campus) query.campus = campus;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const cacheKey = `listings:${JSON.stringify({ query, sort, page, limit })}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate('seller', 'name reputation campus walletAddress')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Listing.countDocuments(query),
    ]);

    const result = {
      listings,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    };
    await cacheSet(cacheKey, result, 60);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// @GET /api/listings/:id
exports.getListing = async (req, res, next) => {
  try {
    const cacheKey = `listing:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, listing: cached });

    const listing = await Listing.findById(req.params.id).populate(
      'seller',
      'name reputation campus walletAddress isVerified'
    );
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    // increment views
    await Listing.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    await cacheSet(cacheKey, listing, 120);
    res.json({ success: true, listing });
  } catch (error) {
    next(error);
  }
};

// @POST /api/listings
exports.createListing = async (req, res, next) => {
  try {
    const { title, description, category, type, price, priceUnit, condition, location, tags, availability } = req.body;

    const listing = await Listing.create({
      seller: req.user._id,
      title,
      description,
      category,
      type,
      price,
      priceUnit: priceUnit || 'fixed',
      condition,
      campus: req.user.campus,
      location,
      tags: tags || [],
      availability,
    });

    await cacheDelPattern('listings:*');
    res.status(201).json({ success: true, listing });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/listings/:id
exports.updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updatable = ['title', 'description', 'price', 'priceUnit', 'condition', 'location', 'tags', 'status', 'availability'];
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) listing[field] = req.body[field];
    });

    await listing.save();
    await cacheDel(`listing:${req.params.id}`);
    await cacheDelPattern('listings:*');
    res.json({ success: true, listing });
  } catch (error) {
    next(error);
  }
};

// @DELETE /api/listings/:id
exports.deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    listing.status = 'deleted';
    await listing.save();
    await cacheDel(`listing:${req.params.id}`);
    await cacheDelPattern('listings:*');
    res.json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    next(error);
  }
};

// @GET /api/listings/my
exports.getMyListings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { seller: req.user._id };
    if (status) query.status = status;

    const listings = await Listing.find(query).sort('-createdAt');
    res.json({ success: true, listings, total: listings.length });
  } catch (error) {
    next(error);
  }
};

// @POST /api/listings/:id/save
exports.saveListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    const isSaved = listing.saves.includes(req.user._id);
    if (isSaved) {
      listing.saves.pull(req.user._id);
    } else {
      listing.saves.push(req.user._id);
    }
    await listing.save();
    res.json({ success: true, saved: !isSaved, totalSaves: listing.saves.length });
  } catch (error) {
    next(error);
  }
};

// @GET /api/listings/stats
exports.getStats = async (req, res, next) => {
  try {
    const cacheKey = 'listings:stats';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    const [activeListings, totalVolume] = await Promise.all([
      Listing.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: { $in: ['sold', 'rented'] } }),
    ]);

    const categoryStats = await Listing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const stats = { activeListings, totalVolume, categoryStats };
    await cacheSet(cacheKey, stats, 300);
    res.json({ success: true, ...stats });
  } catch (error) {
    next(error);
  }
};
