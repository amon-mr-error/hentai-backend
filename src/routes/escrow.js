const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/escrowController');

router.use(protect);

router.get('/my', ctrl.getMyEscrows);
router.get('/stats', adminOnly, ctrl.getEscrowStats);
router.get('/:id', ctrl.getEscrow);

router.post('/create', ctrl.createEscrow);
router.post('/:id/lock', ctrl.lockEscrow);
router.post('/:id/ship', ctrl.shipOrder);
router.post('/:id/confirm-delivery', ctrl.confirmDelivery);
router.post('/:id/dispute', ctrl.raiseDispute);
router.post('/:id/resolve', adminOnly, ctrl.resolveDispute);
router.post('/:id/cancel', ctrl.cancelEscrow);
router.post('/:id/rate', ctrl.rateTransaction);

module.exports = router;
