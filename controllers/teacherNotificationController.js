const TeacherNotification = require("../models/teacherNotificationModel");

// Function to add a new notification
const addNotification = async (userId, title, body) => {
  try {
    const newNotification = new TeacherNotification({
      user_id: userId,
      title,
      body,
    });

    await newNotification.save();
  } catch (error) {
    console.error("Error saving notification:", error.message);
    throw error;
  }
};

module.exports = {
  addNotification,
};
