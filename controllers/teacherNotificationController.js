const TeacherNotification = require("../models/teacherNotificationModel");
const asyncHandler = require("express-async-handler");
const Course = require("../models/course");
const { User } = require("../models/userModel.js");
const admin = require("firebase-admin"); // Import firebase-admin
const TeacherAttendance = require("../models/teacherAttendanceModel.js");
const sendFCMNotification = async (registrationToken, title, body) => {
  const message = {
    notification: {
      title,
      body,
    },
    token: registrationToken,
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error };
  }
};

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
  const user_id = req.headers.userID;
  try {
    const count = await TeacherNotification.countDocuments({ teacher_id: user_id });

    const notifications = await TeacherNotification.find({ teacher_id: user_id })
      .sort({ created_at: -1 }) // Sort by descending order of creation date
      .populate("user_id", "full_name profile_pic") // Populate user details from User collection
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
  const { course_id, meeting_id, call_id, attended_at } = req.body;
  const teacher_id = req.headers.userID;

  try {
    // Find the course by course_id
    const course = await Course.findById({ _id: course_id, teacher_id: teacher_id });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Update course details
    course.meeting_id = meeting_id;
    course.call_id = call_id;
    course.start_meeting = true;
    await course.save();

    // Fetch all users subscribed to the course
    const users = await User.find({ _id: { $in: course.userIds } });

    if (users.length === 0) {
      return res.status(404).json({ message: "No users subscribed to this course" });
    }

    // Decrease missingDays for the teacher
    const teacher = await User.findOne({ _id: teacher_id });
    console.log(teacher);
    if (teacher) {
      teacher.missingDays = Math.max(0, teacher.missingDays - 1); // Ensure it doesn't go below zero
      await teacher.save();
    }

    // Send notifications to each user
    const notificationPromises = users.map(async (user) => {
      if (user.firebase_token) {
        const registrationToken = user.firebase_token;
        const title = "New Course Notification";
        const body = `A new course notification for ${course.title}`;
        console.log(registrationToken);
        const notificationResult = await sendFCMNotification(registrationToken, title, body);
        if (notificationResult.success) {
          console.log("Notification sent successfully:", notificationResult.response);
        } else {
          console.error("Failed to send notification:", notificationResult.error);
        }
      }
    });

    await Promise.all(notificationPromises);

    // Save course detail to TeacherAttendance model
    const attendance = new TeacherAttendance({
      teacher_id: course.teacher_id,
      course_id: course_id,
      course_title: course.title,
      attended_at: attended_at,
    });
    await attendance.save();

    res.status(200).json({ message: "Notifications sent successfully", UserIds: course.userIds, attendance });
  } catch (error) {
    console.error("Error sending notifications:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const resetCourseMeeting = asyncHandler(async (req, res) => {
  const { course_id } = req.body;
  const teacher_id = req.headers.userID;

  try {
    // Find the course by course_id and teacher_id
    const course = await Course.findById({ _id: course_id, teacher_id: teacher_id });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Reset course details
    course.meeting_id = null;
    course.call_id = null;
    course.start_meeting = false;
    await course.save();

    // Fetch all users subscribed to the course
    const users = await User.find({ _id: { $in: course.userIds } });

    if (users.length === 0) {
      return res.status(404).json({ message: "No users subscribed to this course" });
    }

    // Send notifications to each user
    const notificationPromises = users.map(async (user) => {
      if (user.firebase_token) {
        const registrationToken = user.firebase_token;
        const title = "New Course Notification";
        const body = `A new course notification for ${course.title}`;
        console.log(registrationToken);
        const notificationResult = await sendFCMNotification(registrationToken, title, body);
        if (notificationResult.success) {
          console.log("Notification sent successfully:", notificationResult.response);
        } else {
          console.error("Failed to send notification:", notificationResult.error);
        }
      }
    });

    await Promise.all(notificationPromises);

    res.status(200).json({ message: "Course meeting details reset successfully", course });
  } catch (error) {
    console.error("Error resetting course meeting details:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getMissingAttendanceDays = asyncHandler(async (req, res) => {
  const { course_id, teacher_id } = req.body;

  try {
    // Find the course by course_id and teacher_id
    const course = await Course.findOne({ _id: course_id, teacher_id: teacher_id });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Fetch all attendance records for the course
    const attendanceRecords = await TeacherAttendance.find({
      course_id: course_id,
      teacher_id: teacher_id,
    });

    // Parse startDate and endDate
    const startDate = new Date(course.startDate.replace(/\//g, "-"));
    const endDate = new Date(course.endDate.replace(/\//g, "-"));

    // Create a set of all weekdays between the startDate and endDate
    const allDaysSet = new Set();
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Skip weekends
        allDaysSet.add(currentDate.toISOString().split("T")[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Create a set of all days when attendance was recorded, converting to ISO format
    const attendanceDaysSet = new Set(
      attendanceRecords.map((record) => {
        const [day, month, year] = record.attended_at.split("/");
        return new Date(`${year}-${month}-${day}`).toISOString().split("T")[0];
      })
    );

    // Calculate missing days by subtracting attendanceDaysSet from allDaysSet
    const missingDays = [...allDaysSet].filter((day) => !attendanceDaysSet.has(day));

    res.status(200).json({ missingDays, course });
  } catch (error) {
    console.error("Error calculating missing attendance days:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = {
  addNotification,
  getTeacherNotifications,
  sendCourseNotification,
  getMissingAttendanceDays,
  resetCourseMeeting,
};
