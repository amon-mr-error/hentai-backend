const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/listingController');

router.get('/', optionalAuth, ctrl.getListings);
router.get('/stats', ctrl.getStats);
router.get('/my', protect, ctrl.getMyListings);
router.get('/:id', optionalAuth, ctrl.getListing);

router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').notEmpty().withMessage('Description required'),
    body('category').isIn(['Electronics', 'Books', 'Lab Gear', 'Clothing', 'Vehicles', 'Other']).withMessage('Invalid category'),
    body('type').isIn(['sell', 'rent']).withMessage('Type must be sell or rent'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  ],
  validate,
  ctrl.createListing
);

router.put('/:id', protect, ctrl.updateListing);
router.delete('/:id', protect, ctrl.deleteListing);
router.post('/:id/save', protect, ctrl.saveListing);

module.exports = router;
