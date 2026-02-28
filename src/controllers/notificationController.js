const Notification = require('../models/Notification');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

// @GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const cacheKey = `notifications:${req.user._id}:${page}:${unreadOnly}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    const result = { notifications, total, unreadCount, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) };
    await cacheSet(cacheKey, result, 30);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    await cacheDel(`notifications:${req.user._id}`);
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

// @PUT /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    await cacheDel(`notifications:${req.user._id}`);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @DELETE /api/notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    await cacheDel(`notifications:${req.user._id}`);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
