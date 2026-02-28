const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/algorandController');

router.get('/health', ctrl.getHealth);
router.get('/params', ctrl.getSuggestedParams);
router.get('/account/:address', protect, ctrl.getAccountInfo);
router.get('/tx/:txId', protect, ctrl.getTransaction);
router.post('/create-wallet', protect, ctrl.createWallet);
router.post('/verify-tx', protect, ctrl.verifyTransaction);

module.exports = router;
