const Task = require('../models/Task');
const Escrow = require('../models/Escrow');
const { createNotification } = require('../services/notificationService');
const { cacheDelPattern } = require('../config/redis');

// @GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const { campus, status = 'OPEN', category, isUrgent, page = 1, limit = 10 } = req.query;
    const query = {};
    if (campus) query.campus = campus;
    if (status) query.status = status;
    if (category) query.category = category;
    if (isUrgent !== undefined) query.isUrgent = isUrgent === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('poster', 'name reputation campus')
        .populate('runner', 'name reputation')
        .sort({ isUrgent: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(query),
    ]);

    res.json({ success: true, tasks, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// @GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('poster', 'name reputation campus walletAddress')
      .populate('runner', 'name reputation walletAddress')
      .populate('applicants', 'name reputation');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, category, reward, isUrgent, pickupLocation, dropLocation, deadline } = req.body;

    const task = await Task.create({
      poster: req.user._id,
      title,
      description,
      category: category || 'Other',
      reward,
      isUrgent: isUrgent || false,
      pickupLocation,
      dropLocation,
      campus: req.user.campus,
      deadline,
    });

    await cacheDelPattern('tasks:*');
    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @POST /api/tasks/:id/apply
exports.applyForTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== 'OPEN') return res.status(400).json({ success: false, message: 'Task not open' });
    if (task.poster.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot apply to own task' });
    }
    if (task.applicants.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already applied' });
    }

    task.applicants.push(req.user._id);
    await task.save();

    await createNotification({
      recipient: task.poster,
      type: 'TASK_APPLIED',
      title: 'New Applicant!',
      message: `Someone applied for your task: ${task.title}`,
      data: { taskId: task._id },
    });

    res.json({ success: true, message: 'Applied successfully' });
  } catch (error) {
    next(error);
  }
};

// @POST /api/tasks/:id/accept/:runnerId
exports.acceptRunner = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.poster.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only poster can accept runner' });
    }
    if (task.status !== 'OPEN') return res.status(400).json({ success: false, message: 'Task not open' });

    const runnerId = req.params.runnerId;
    if (!task.applicants.map(a => a.toString()).includes(runnerId)) {
      return res.status(400).json({ success: false, message: 'Runner has not applied' });
    }

    task.runner = runnerId;
    task.status = 'ACCEPTED';
    await task.save();

    await createNotification({
      recipient: runnerId,
      type: 'TASK_ACCEPTED',
      title: 'Task Accepted!',
      message: `You've been selected for: ${task.title}. Reward: ${task.reward} ALGO`,
      data: { taskId: task._id },
    });

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @POST /api/tasks/:id/start
exports.startTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.runner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only runner can start task' });
    }
    if (task.status !== 'ACCEPTED') return res.status(400).json({ success: false, message: 'Task not accepted' });

    task.status = 'IN_PROGRESS';
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @POST /api/tasks/:id/complete
exports.completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.poster.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only poster can mark complete' });
    }
    if (task.status !== 'IN_PROGRESS') return res.status(400).json({ success: false, message: 'Task not in progress' });

    task.status = 'COMPLETED';
    await task.save();

    await createNotification({
      recipient: task.runner,
      type: 'TASK_COMPLETED',
      title: 'Task Completed!',
      message: `Task "${task.title}" marked complete. ${task.reward} ALGO released!`,
      data: { taskId: task._id },
    });

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @POST /api/tasks/:id/cancel
exports.cancelTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.poster.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (['COMPLETED', 'CANCELLED'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel' });
    }

    task.status = 'CANCELLED';
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @POST /api/tasks/:id/rate
exports.rateTask = async (req, res, next) => {
  try {
    const { score, comment, ratingFor } = req.body; // ratingFor: 'poster' | 'runner'
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== 'COMPLETED') return res.status(400).json({ success: false, message: 'Task not completed' });

    if (ratingFor === 'runner' && task.poster.toString() === req.user._id.toString()) {
      task.runnerRating = { score, comment };
    } else if (ratingFor === 'poster' && task.runner.toString() === req.user._id.toString()) {
      task.posterRating = { score, comment };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid rating' });
    }

    await task.save();
    res.json({ success: true, message: 'Rated successfully' });
  } catch (error) {
    next(error);
  }
};

// @GET /api/tasks/my
exports.getMyTasks = async (req, res, next) => {
  try {
    const { role = 'poster' } = req.query;
    const query = role === 'runner' ? { runner: req.user._id } : { poster: req.user._id };
    const tasks = await Task.find(query)
      .populate('poster', 'name reputation')
      .populate('runner', 'name reputation')
      .sort('-createdAt');
    res.json({ success: true, tasks, total: tasks.length });
  } catch (error) {
    next(error);
  }
};
