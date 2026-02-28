const Notification = require('../models/Notification');
const { cacheDel } = require('../config/redis');

const createNotification = async ({ recipient, type, title, message, data = {} }) => {
  try {
    const notification = await Notification.create({ recipient, type, title, message, data });
    await cacheDel(`notifications:${recipient}`);
    return notification;
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
};

module.exports = { createNotification };
