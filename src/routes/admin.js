const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/dashboard', ctrl.getDashboard);
router.get('/users', ctrl.getUsers);
router.get('/disputes', ctrl.getDisputes);
router.get('/analytics', ctrl.getAnalytics);
router.put('/users/:id/verify', ctrl.verifyUser);
router.put('/users/:id/toggle-status', ctrl.toggleUserStatus);
router.post('/process-timeouts', ctrl.processTimeouts);

module.exports = router;
