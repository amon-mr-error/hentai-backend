const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/rentalController');

router.use(protect);

router.get('/my', ctrl.getMyRentals);
router.get('/:id', ctrl.getRental);
router.post('/request', ctrl.requestRental);
router.post('/:id/approve', ctrl.approveRental);
router.post('/:id/return', ctrl.returnItem);

module.exports = router;
