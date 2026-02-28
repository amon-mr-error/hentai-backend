const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/taskController');

router.get('/', ctrl.getTasks);
router.get('/my', protect, ctrl.getMyTasks);
router.get('/:id', ctrl.getTask);

router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').notEmpty().withMessage('Description required'),
    body('reward').isFloat({ min: 0 }).withMessage('Valid reward required'),
    body('pickupLocation').notEmpty().withMessage('Pickup location required'),
    body('dropLocation').notEmpty().withMessage('Drop location required'),
  ],
  validate,
  ctrl.createTask
);

router.post('/:id/apply', protect, ctrl.applyForTask);
router.post('/:id/accept/:runnerId', protect, ctrl.acceptRunner);
router.post('/:id/start', protect, ctrl.startTask);
router.post('/:id/complete', protect, ctrl.completeTask);
router.post('/:id/cancel', protect, ctrl.cancelTask);
router.post('/:id/rate', protect, ctrl.rateTask);

module.exports = router;
