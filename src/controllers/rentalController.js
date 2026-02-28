const Rental = require('../models/Rental');
const Listing = require('../models/Listing');
const Escrow = require('../models/Escrow');
const { createNotification } = require('../services/notificationService');
const { createEscrow } = require('../services/escrowService');

// @POST /api/rentals/request
exports.requestRental = async (req, res, next) => {
  try {
    const { listingId, startDate, endDate, notes } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.type !== 'rent') return res.status(400).json({ success: false, message: 'Not a rental listing' });
    if (listing.status !== 'active') return res.status(400).json({ success: false, message: 'Not available' });
    if (listing.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot rent own item' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return res.status(400).json({ success: false, message: 'Invalid dates' });

    const ms = end - start;
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));

    let rentAmount;
    if (listing.priceUnit === 'per_hour') rentAmount = listing.price * hours;
    else if (listing.priceUnit === 'per_day') rentAmount = listing.price * days;
    else rentAmount = listing.price;

    const deposit = rentAmount * 0.5;
    const totalCharged = rentAmount + deposit;

    // Create escrow
    const escrow = await createEscrow({
      listingId,
      buyerId: req.user._id,
      rentalPeriod: { from: start, to: end },
    });

    const rental = await Rental.create({
      listing: listingId,
      renter: req.user._id,
      owner: listing.seller,
      startDate: start,
      endDate: end,
      rentAmount,
      deposit,
      totalCharged,
      escrow: escrow._id,
      notes,
    });

    await createNotification({
      recipient: listing.seller,
      type: 'RENTAL_REQUEST',
      title: 'Rental Request',
      message: `New rental request for "${listing.title}"`,
      data: { rentalId: rental._id },
    });

    res.status(201).json({ success: true, rental, escrow });
  } catch (error) {
    next(error);
  }
};

// @POST /api/rentals/:id/approve
exports.approveRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('listing');
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    if (rental.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can approve' });
    }
    if (rental.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Not pending' });

    rental.status = 'ACTIVE';
    await rental.save();

    await Listing.findByIdAndUpdate(rental.listing, { status: 'rented' });

    await createNotification({
      recipient: rental.renter,
      type: 'RENTAL_APPROVED',
      title: 'Rental Approved!',
      message: `Your rental request has been approved.`,
      data: { rentalId: rental._id },
    });

    res.json({ success: true, rental });
  } catch (error) {
    next(error);
  }
};

// @POST /api/rentals/:id/return
exports.returnItem = async (req, res, next) => {
  try {
    const { conditionOnReturn } = req.body;
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    if (rental.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can confirm return' });
    }
    if (rental.status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Not active' });

    rental.status = 'RETURNED';
    rental.conditionOnReturn = conditionOnReturn || 'Good';

    if (conditionOnReturn === 'Good') {
      rental.depositRefunded = true;
      rental.depositRefundTxId = `refund_deposit_${Date.now()}`;
    }

    await rental.save();
    await Listing.findByIdAndUpdate(rental.listing, { status: 'active' });

    await createNotification({
      recipient: rental.renter,
      type: 'RENTAL_RETURNED',
      title: 'Item Returned',
      message: `Item returned. Condition: ${conditionOnReturn}. ${conditionOnReturn === 'Good' ? 'Deposit refunded!' : 'Deposit withheld.'}`,
      data: { rentalId: rental._id },
    });

    res.json({ success: true, rental });
  } catch (error) {
    next(error);
  }
};

// @GET /api/rentals/my
exports.getMyRentals = async (req, res, next) => {
  try {
    const { role = 'renter' } = req.query;
    const query = role === 'owner' ? { owner: req.user._id } : { renter: req.user._id };
    const rentals = await Rental.find(query)
      .populate('listing', 'title images price priceUnit')
      .populate('renter', 'name reputation')
      .populate('owner', 'name reputation')
      .sort('-createdAt');
    res.json({ success: true, rentals, total: rentals.length });
  } catch (error) {
    next(error);
  }
};

// @GET /api/rentals/:id
exports.getRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('listing')
      .populate('renter', 'name reputation walletAddress')
      .populate('owner', 'name reputation walletAddress')
      .populate('escrow');

    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    const isParty = [rental.renter._id.toString(), rental.owner._id.toString()].includes(req.user._id.toString());
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, rental });
  } catch (error) {
    next(error);
  }
};
