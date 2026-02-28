const Escrow = require('../models/Escrow');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { createNotification } = require('./notificationService');
const { cacheDel } = require('../config/redis');

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || 1);
const ESCROW_TIMEOUT_HOURS = parseInt(process.env.ESCROW_TIMEOUT_HOURS || 72);

// Calculate fees
const calculateFees = (amount) => {
  const platformFee = parseFloat(((amount * PLATFORM_FEE_PERCENT) / 100).toFixed(6));
  const sellerReceives = parseFloat((amount - platformFee).toFixed(6));
  return { platformFee, sellerReceives };
};

// Create escrow for a marketplace purchase
const createEscrow = async ({ listingId, buyerId, rentalPeriod = null }) => {
  const listing = await Listing.findById(listingId).populate('seller');
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'active') throw new Error('Listing is not available');
  if (listing.seller._id.toString() === buyerId.toString()) {
    throw new Error('Cannot buy your own listing');
  }

  // Check for existing open escrow
  const existing = await Escrow.findOne({ listing: listingId, buyer: buyerId, state: { $in: ['PENDING', 'LOCKED', 'IN_TRANSIT'] } });
  if (existing) throw new Error('You already have an active escrow for this listing');

  let amount = listing.price;
  let deposit = 0;

  if (listing.type === 'rent' && rentalPeriod) {
    const { from, to } = rentalPeriod;
    const ms = new Date(to) - new Date(from);
    if (ms <= 0) throw new Error('Invalid rental period');

    if (listing.priceUnit === 'per_hour') {
      const hours = Math.ceil(ms / (1000 * 60 * 60));
      amount = listing.price * hours;
    } else if (listing.priceUnit === 'per_day') {
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      amount = listing.price * days;
    }
    deposit = amount * 0.5; // 50% deposit for rentals
    amount += deposit;
  }

  const { platformFee, sellerReceives } = calculateFees(listing.type === 'rent' ? amount - deposit : amount);

  const expiresAt = new Date(Date.now() + ESCROW_TIMEOUT_HOURS * 60 * 60 * 1000);

  const escrow = await Escrow.create({
    listing: listingId,
    buyer: buyerId,
    seller: listing.seller._id,
    amount,
    platformFee,
    sellerReceives,
    deposit,
    escrowExpiresAt: expiresAt,
    autoRefundEligible: true,
    rentalPeriod: rentalPeriod || undefined,
    stateHistory: [{ state: 'PENDING', note: 'Escrow created' }],
  });

  // Notify seller
  await createNotification({
    recipient: listing.seller._id,
    type: 'ESCROW_CREATED',
    title: 'New Order!',
    message: `${listing.title} has a new buyer. Escrow pending.`,
    data: { escrowId: escrow._id, listingId },
  });

  return escrow;
};

// Lock funds (simulate on-chain lock confirmation)
const lockEscrow = async (escrowId, buyerId, txId) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  if (escrow.buyer.toString() !== buyerId.toString()) throw new Error('Unauthorized');
  if (escrow.state !== 'PENDING') throw new Error(`Cannot lock escrow in state: ${escrow.state}`);

  escrow.lockTxId = txId || `simulated_lock_${Date.now()}`;
  escrow.transitionState('LOCKED', buyerId, 'Funds locked on-chain');

  // Mark listing as pending
  await Listing.findByIdAndUpdate(escrow.listing, { status: listing => listing.type === 'rent' ? 'rented' : 'sold' });

  await escrow.save();

  await createNotification({
    recipient: escrow.seller,
    type: 'ESCROW_LOCKED',
    title: 'Payment Locked!',
    message: 'Buyer has locked funds in escrow. Ship the item.',
    data: { escrowId },
  });

  return escrow;
};

// Ship order (seller action)
const shipOrder = async (escrowId, sellerId) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  if (escrow.seller.toString() !== sellerId.toString()) throw new Error('Unauthorized');
  if (escrow.state !== 'LOCKED') throw new Error(`Cannot ship from state: ${escrow.state}`);

  escrow.transitionState('IN_TRANSIT', sellerId, 'Seller shipped the item');
  await escrow.save();

  await createNotification({
    recipient: escrow.buyer,
    type: 'ORDER_SHIPPED',
    title: 'Item Shipped!',
    message: 'The seller has shipped your item. Confirm on delivery.',
    data: { escrowId },
  });

  return escrow;
};

// Confirm delivery (buyer action) → releases funds
const confirmDelivery = async (escrowId, buyerId) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  if (escrow.buyer.toString() !== buyerId.toString()) throw new Error('Unauthorized');
  if (!['IN_TRANSIT', 'LOCKED'].includes(escrow.state)) {
    throw new Error(`Cannot confirm delivery from state: ${escrow.state}`);
  }

  // Simulate release tx
  escrow.releaseTxId = `simulated_release_${Date.now()}`;
  escrow.transitionState('DELIVERED', buyerId, 'Buyer confirmed delivery');
  await escrow.save();

  // Update seller reputation
  await User.findByIdAndUpdate(escrow.seller, {
    $inc: { 'reputation.totalTransactions': 1 },
  });

  await createNotification({
    recipient: escrow.seller,
    type: 'ORDER_DELIVERED',
    title: 'Payment Released!',
    message: `${escrow.sellerReceives} ALGO has been released to your wallet.`,
    data: { escrowId, amount: escrow.sellerReceives },
  });

  return escrow;
};

// Raise dispute
const raiseDispute = async (escrowId, userId, reason) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  const isParty = [escrow.buyer.toString(), escrow.seller.toString()].includes(userId.toString());
  if (!isParty) throw new Error('Unauthorized');
  if (!['LOCKED', 'IN_TRANSIT'].includes(escrow.state)) {
    throw new Error(`Cannot dispute from state: ${escrow.state}`);
  }

  escrow.disputeRaisedBy = userId;
  escrow.disputeReason = reason;
  escrow.disputeRaisedAt = new Date();
  escrow.transitionState('DISPUTED', userId, `Dispute raised: ${reason}`);
  await escrow.save();

  const otherParty = escrow.buyer.toString() === userId.toString() ? escrow.seller : escrow.buyer;
  await createNotification({
    recipient: otherParty,
    type: 'DISPUTE_RAISED',
    title: 'Dispute Opened',
    message: `A dispute has been raised for your order: ${reason}`,
    data: { escrowId },
  });

  return escrow;
};

// Admin: resolve dispute
const resolveDispute = async (escrowId, adminId, resolution, favourBuyer) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  if (escrow.state !== 'DISPUTED') throw new Error('Escrow not in dispute');

  escrow.disputeResolvedBy = adminId;
  escrow.disputeResolution = resolution;

  if (favourBuyer) {
    escrow.refundTxId = `simulated_refund_${Date.now()}`;
    escrow.transitionState('RESOLVED', adminId, `Resolved in buyer's favour: ${resolution}`);
  } else {
    escrow.releaseTxId = `simulated_release_${Date.now()}`;
    escrow.transitionState('RESOLVED', adminId, `Resolved in seller's favour: ${resolution}`);
  }

  await escrow.save();

  // Notify both parties
  await createNotification({ recipient: escrow.buyer, type: 'DISPUTE_RESOLVED', title: 'Dispute Resolved', message: resolution, data: { escrowId } });
  await createNotification({ recipient: escrow.seller, type: 'DISPUTE_RESOLVED', title: 'Dispute Resolved', message: resolution, data: { escrowId } });

  return escrow;
};

// Cancel escrow (before shipping)
const cancelEscrow = async (escrowId, userId) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  const isParty = [escrow.buyer.toString(), escrow.seller.toString()].includes(userId.toString());
  if (!isParty) throw new Error('Unauthorized');
  if (!['PENDING', 'LOCKED'].includes(escrow.state)) {
    throw new Error(`Cannot cancel from state: ${escrow.state}`);
  }

  if (escrow.state === 'LOCKED') {
    escrow.refundTxId = `simulated_refund_${Date.now()}`;
  }
  escrow.transitionState('CANCELLED', userId, 'Escrow cancelled');
  await escrow.save();

  // Restore listing
  await Listing.findByIdAndUpdate(escrow.listing, { status: 'active' });

  return escrow;
};

// Auto-refund timed out escrows (cron job)
const processTimeouts = async () => {
  const now = new Date();
  const timedOut = await Escrow.find({
    state: { $in: ['LOCKED', 'IN_TRANSIT'] },
    escrowExpiresAt: { $lt: now },
    autoRefundEligible: true,
  });

  for (const escrow of timedOut) {
    escrow.refundTxId = `auto_refund_${Date.now()}`;
    escrow.transitionState('TIMEOUT_REFUND', null, 'Auto-refunded due to timeout');
    await escrow.save();
    await Listing.findByIdAndUpdate(escrow.listing, { status: 'active' });
    await createNotification({
      recipient: escrow.buyer,
      type: 'GENERAL',
      title: 'Auto-Refund Processed',
      message: 'Your escrow timed out and funds have been refunded.',
      data: { escrowId: escrow._id },
    });
  }
  return timedOut.length;
};

module.exports = {
  createEscrow,
  lockEscrow,
  shipOrder,
  confirmDelivery,
  raiseDispute,
  resolveDispute,
  cancelEscrow,
  processTimeouts,
  calculateFees,
};
