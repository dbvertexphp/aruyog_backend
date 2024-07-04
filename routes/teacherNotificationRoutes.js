// routes/notificationRoutes.js
const express = require("express");
const { getTeacherNotifications, sendCourseNotification } = require("../controllers/teacherNotificationController");
const protect = require("../middleware/authMiddleware.js");

const teacherNotificationsRoutes = express.Router();

// GET notifications for a user
teacherNotificationsRoutes.route("/getTeacherNotifications").get(protect, getTeacherNotifications);
teacherNotificationsRoutes.route("/sendCourseNotification").post(sendCourseNotification);

module.exports = { teacherNotificationsRoutes };
