const TeacherNotification = require("../models/teacherNotificationModel");
const asyncHandler = require("express-async-handler");
const Course = require("../models/course");
const { User } = require("../models/userModel.js");
const admin = require("firebase-admin"); // Import firebase-admin

// Function to add a new notification
const addNotification = async (userId, teacher_Id, title, course_title, amount) => {
  try {
    const newNotification = new TeacherNotification({
      user_id: userId,
      teacher_id: teacher_Id,
      title,
      body: course_title,
      amount: amount,
    });

    await newNotification.save();
  } catch (error) {
    console.error("Error saving notification:", error.message);
    throw error;
  }
};

const getTeacherNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
  const perPage = 10; // Number of notifications per page

  try {
    const count = await TeacherNotification.countDocuments({ user_id: req.headers.userID });

    const notifications = await TeacherNotification.find({ user_id: req.headers.userID })
      .sort({ created_at: -1 }) // Sort by descending order of creation date
      .populate("user_id", "full_name") // Populate user details from User collection
      .skip((page - 1) * perPage)
      .limit(perPage)
      .exec();

    const totalPages = Math.ceil(count / perPage);

    res.status(200).json({
      notifications,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const sendCourseNotification = asyncHandler(async (req, res) => {
  const { course_id } = req.body;

  try {
    // Find the course by course_id
    const course = await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Fetch all users subscribed to the course
    const users = await User.find({ _id: { $in: course.userIds } });

    if (users.length === 0) {
      return res.status(404).json({ message: "No users subscribed to this course" });
    }

    // Prepare notification message
    const message = {
      notification: {
        title: "New Course Notification",
        body: `A new course notification for ${course.title}`,
      },
    };

    // Send notifications to each user
    const notificationPromises = users.map(async (user) => {
      if (user.firebase_token && user.firebase_token !== "dummy_token") {
        message.token = user.firebase_token;
        await admin.messaging().send(message);
      }
    });

    await Promise.all(notificationPromises);

    res.status(200).json({ message: "Notifications sent successfully", UserIds: course.userIds });
  } catch (error) {
    console.error("Error sending notifications:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = {
  addNotification,
  getTeacherNotifications,
  sendCourseNotification,
};
