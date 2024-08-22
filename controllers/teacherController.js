const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const { User, NotificationMessages, AdminDashboard, WebNotification } = require("../models/userModel.js");
const dotenv = require("dotenv");
const baseURL = process.env.BASE_URL;
const ErrorHandler = require("../utils/errorHandler.js");
const http = require("https");
const Course = require("../models/course.js");
const ConnectyCube = require("connectycube");
const upload = require("../middleware/uploadMiddleware.js");
const fs = require("fs");
const { addDays, isWeekend, addMonths, getMonth, getDay } = require("date-fns");
const moment = require("moment-business-days");
const { log } = require("util");
const TeacherPayment = require("../models/TeacherPaymentModel.js");
const Transaction = require("../models/transactionModel.js");
const { sendFCMNotification } = require("./notificationControllers");
const { addNotification } = require("./teacherNotificationController");
const TeacherNotification = require("../models/teacherNotificationModel");

dotenv.config();

const updateTeacherProfileData = asyncHandler(async (req, res) => {
  req.uploadPath = "uploads/profiles";
  upload.fields([
    { name: "profile_pic", maxCount: 1 },
    { name: "background_image", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { first_name, last_name, mobile, email, experience, education, languages, expertise, about_me } = req.body;

    const userId = req.headers.userID; // Assuming you have user authentication middleware

    // Get the profile picture path if uploaded
    const profile_pic = req.files.profile_pic ? `${req.uploadPath}/${req.files.profile_pic[0].filename}` : null;
    const background_image = req.files.background_image ? `${req.uploadPath}/${req.files.background_image[0].filename}` : null;

    try {
      // Find the current user to get the old image paths
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Build the update object with optional fields
      let updateFields = {
        datetime: moment().tz("Asia/Kolkata").format("YYYY-MMM-DD hh:mm:ss A"),
      };

      // Update optional fields if provided
      if (first_name) {
        updateFields.first_name = first_name;
      }
      if (last_name) {
        updateFields.last_name = last_name;
      }
      if (mobile) {
        updateFields.mobile = mobile;
      }
      if (email) {
        updateFields.email = email;
      }
      if (experience) {
        updateFields.experience = experience;
      }
      if (education) {
        updateFields.education = education;
      }
      if (languages) {
        updateFields.languages = languages;
      }
      if (expertise) {
        updateFields.expertise = expertise;
      }
      if (about_me) {
        updateFields.about_me = about_me;
      }

      // Construct full_name if first_name or last_name is provided
      if (first_name || last_name) {
        updateFields.full_name = `${first_name || currentUser.first_name} ${last_name || currentUser.last_name}`;
      }

      // Check if there is a new profile pic uploaded and delete the old one
      if (profile_pic && currentUser.profile_pic) {
        const oldProfilePicPath = currentUser.profile_pic;
        updateFields.profile_pic = profile_pic;

        // Delete the old profile picture
        deleteFile(oldProfilePicPath);
      } else if (profile_pic) {
        updateFields.profile_pic = profile_pic;
      }

      // Check if there is a new background image uploaded and delete the old one
      if (background_image && currentUser.background_image) {
        const oldBackgroundImagePath = currentUser.background_image;
        updateFields.background_image = background_image;

        // Delete the old background image
        deleteFile(oldBackgroundImagePath);
      } else if (background_image) {
        updateFields.background_image = background_image;
      }

      // Update the user's profile fields
      const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        _id: updatedUser._id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        full_name: updatedUser.full_name,
        mobile: updatedUser.mobile,
        email: updatedUser.email,
        experience: updatedUser.experience,
        education: updatedUser.education,
        languages: updatedUser.languages,
        expertise: updatedUser.expertise,
        about_me: updatedUser.about_me,
        background_image: updatedUser.background_image,
        profile_pic: updatedUser.profile_pic,
        status: true,
      });
    } catch (error) {
      console.error("Error updating user profile:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});

const getTeacherProfileData = asyncHandler(async (req, res) => {
  const userId = req.headers.userID; // Assuming you have user authentication middleware

  try {
    // Find the user by ID
    const user = await User.findById({ _id: userId, deleted_at: null });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let paymentDetails = {};
    if (user.payment_id) {
      // Fetch payment details from TeacherPayment model
      const payment = await TeacherPayment.findById(user.payment_id);
      if (payment) {
        paymentDetails = {
          type: payment.advance ? "advance" : "master", // Determine type based on available fields
          amount: payment.advance || payment.master,
        };
      }
    }

    // Return the user's profile information
    return res.status(200).json({
      user: user,
      status: true,
      payment: paymentDetails,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const getTeacherProfileDataByTeacherId = asyncHandler(async (req, res) => {
  const { teacher_id } = req.params; // Assuming you have user authentication middleware
  console.log(req.params);
  try {
    // Find the user by ID
    const user = await User.findById({ _id: teacher_id, deleted_at: null });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let paymentDetails = {};

    // Fetch payment details from TeacherPayment model for groupPaymentId
    if (user.groupPaymentId) {
      const groupPayment = await TeacherPayment.findById(user.groupPaymentId);
      if (groupPayment) {
        paymentDetails.groupPayment = {
          type: groupPayment.advance_group ? "advance_group" : "master_group",
          amount: groupPayment.advance_group || groupPayment.master_group,
          payment_Id: groupPayment._id || groupPayment._id,
        };
      }
    }

    // Fetch payment details from TeacherPayment model for singlePaymentId
    if (user.singlePaymentId) {
      const singlePayment = await TeacherPayment.findById(user.singlePaymentId);
      if (singlePayment) {
        paymentDetails.singlePayment = {
          type: singlePayment.advance_single ? "advance_single" : "master_single",
          amount: singlePayment.advance_single || singlePayment.master_single,
          payment_Id: singlePayment._id || singlePayment._id,
        };
      }
    }

    // Return the user's profile information
    return res.status(200).json({
      user: user,
      status: true,
      payment: paymentDetails,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to delete a file from the filesystem
function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
    } else {
      console.log(`Deleted file: ${filePath}`);
    }
  });
}

const addCourse = asyncHandler(async (req, res, next) => {
      req.uploadPath = "uploads/course";
      upload.single("course_image")(req, res, async (err) => {
        if (err) {
          return next(new ErrorHandler(err.message, 400));
        }
        const { category_id, sub_category_id, type, startTime, endTime } = req.body;
        const teacher_id = req.headers.userID; // Assuming user authentication middleware sets this header

        try {
          // Validate required fields
          if ( !category_id || !sub_category_id || !type || !startTime || !endTime) {
            return res.status(400).json({
              error: "All fields ( category_id, sub_category_id, type, startTime, endTime) are required.",
            });
          }

          // Check if the teacher has already added 6 courses
          const coursesCount = await Course.countDocuments({
            teacher_id,
          });

          if (coursesCount >= 6) {
            return res.status(400).json({
              error: "Teacher cannot add more than 6 courses.",
            });
          }

          // Check if the course types are valid
          const courses = await Course.find({
            teacher_id,
          });

          let groupCourseCount = 0;
          let singleCourseCount = 0;

          courses.forEach((course) => {
            if (course.type === "group_course") {
              groupCourseCount++;
            } else if (course.type === "single_course") {
              singleCourseCount++;
            }
          });

          // Check if the teacher can add more of the requested type
          if ((type === "group_course" && groupCourseCount >= 3) || (type === "single_course" && singleCourseCount >= 3)) {
            return res.status(400).json({ error: `Teacher cannot add more than 3 ${type} courses.` });
          }

          // Fetch payment details based on course type
          const user = await User.findById(teacher_id);
          if (!user) {
            return res.status(404).json({ error: "Teacher not found." });
          }

          let paymentDetails = null;
      if (type === "group_course" && user.groupPaymentId) {
        paymentDetails = await TeacherPayment.findById(user.groupPaymentId);
      } else if (type === "single_course" && user.singlePaymentId) {
        paymentDetails = await TeacherPayment.findById(user.singlePaymentId);
      }

      console.log(paymentDetails);



          // Get the profile picture path if uploaded
          const course_image = req.file ? `${req.uploadPath}/${req.file.filename}` : null;

          // Check if teacher has a firebase_token
          if (user.firebase_token) {
            const registrationToken = user.firebase_token;
            const title = `Course Added Successfully`;
            const body = `Based on your profile information, the course will be reviewed by our admin team. Once approved, your course will be active and available for students.`;

            // Send notification
            const notificationResult = await sendFCMNotification(registrationToken, title, body);
            if (notificationResult.success) {
              console.log("Notification sent successfully:", notificationResult.response);
            } else {
              console.error("Failed to send notification:", notificationResult.error);
            }
            await addNotification(null, user._id, body, title, null);
          }

          // Create new course with payment details
          const newCourse = new Course({
            course_image,
            category_id,
            sub_category_id,
            type,
            startTime,
            endTime,
            teacher_id,
            payment_id: paymentDetails ? paymentDetails._id : null,
            amount: paymentDetails ? paymentDetails.amount : null,
            payment_type: paymentDetails ? paymentDetails.type : null,
            deleted_at: null
          });

          const savedCourse = await newCourse.save();

          res.status(201).json({
            _id: savedCourse._id,
            course_image: savedCourse.course_image,
            category_id: savedCourse.category_id,
            sub_category_id: savedCourse.sub_category_id,
            type: savedCourse.type,
            startTime: savedCourse.startTime,
            endTime: savedCourse.endTime,
            teacher_id: savedCourse.teacher_id,
            payment_id: savedCourse.payment_id,
            amount: savedCourse.amount,
            payment_type: savedCourse.payment_type,
            status: true,
          });
        } catch (error) {
          console.error("Error adding course:", error.message);
          res.status(500).json({ error: "Internal Server Error" });
        }
      });
});

const updateCourseDates = asyncHandler(async (req, res) => {
  const { course_id, newStartDate } = req.body;
  const teacher_id = req.headers.userID;

  try {
    // Validate required fields
    if (!course_id || !newStartDate) {
      return res.status(400).json({ error: "Course ID and new start date are required." });
    }

    // Validate and parse new startDate
    const parsedNewStartDate = new Date(newStartDate.replace(/\//g, "-")); // Replace "/" with "-" for correct parsing
    if (isNaN(parsedNewStartDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY/MM/DD." });
    }

    // Find the course by course_id and teacher_id
    const course = await Course.findById({ _id: course_id, teacher_id: teacher_id });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Calculate new end date excluding weekends
    const newEndDate = calculateEndDate(newStartDate, 21); // Excluding weekends
    const formattedNewStartDate = formatDate(newStartDate);
    const formattedNewEndDate = formatDate(newEndDate);

    // Update course with new dates
    course.startDate = formattedNewStartDate;
    course.endDate = formattedNewEndDate;

    const updatedCourse = await course.save();

    res.status(200).json({
      _id: updatedCourse._id,
      category_id: updatedCourse.category_id,
      sub_category_id: updatedCourse.sub_category_id,
      type: updatedCourse.type,
      startTime: updatedCourse.startTime,
      endTime: updatedCourse.endTime,
      startDate: updatedCourse.startDate,
      endDate: updatedCourse.endDate,
      teacher_id: updatedCourse.teacher_id,
      status: true,
    });
  } catch (error) {
    console.error("Error updating course dates:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getTodayCourse = asyncHandler(async (req, res) => {
  const teacherId = req.headers.userID; // Assuming user authentication middleware sets this header

  // Get current date and format it to YYYY-MM-DD
  const currentDate = new Date();
  const formattedCurrentDate = formatDate(currentDate); // Ensure formatDate returns YYYY-MM-DD

  try {
    // Find courses where startDate and endDate include today's date and teacher_id matches
    const courses = await Course.find({
      teacher_id: teacherId,
      deleted_at: null,
      startDate: { $lte: formattedCurrentDate },
      endDate: { $gte: formattedCurrentDate },
      userIds: { $ne: [] },
    })
      .sort({ startTime: 1 }) // Sort by startTime ascending order
      .exec();

    const teacher_ids = teacherId;

    const teacherNotificationData = await TeacherNotification.find({ teacher_id: teacher_ids });
    const unreadCount = teacherNotificationData.filter((notification) => !notification.read).length;

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        message: "Course Not Found",
        status: false,
        notificationCount: unreadCount,
      });
    }

    // Extracting all userIds from courses
    const userIds = courses.reduce((acc, course) => {
      acc.push(...course.userIds);
      return acc;
    }, []);

    // Fetching transactions to get purchase dates
    const transactions = await Transaction.find({
      user_id: { $in: userIds },
      course_id: { $in: courses.map((course) => course._id) },
    }).exec();

    // Mapping transaction data to course IDs
    const purchaseDateMap = transactions.reduce((acc, transaction) => {
      acc[transaction.course_id] = transaction.datetime;
      return acc;
    }, {});

    // Fetching only required fields from User collection
    const users = await User.find(
      { _id: { $in: userIds } },
      {
        profile_pic: 1,
        ConnectyCube_token: 1,
        ConnectyCube_id: 1,
        full_name: 1,
        firebase_token: 1,
      }
    );

    // Mapping userIds to user details for quick lookup
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user.toObject(); // Convert user to plain object
      return acc;
    }, {});

    const teacherDetails = await User.findById(teacherId).select("teacherUnavailabilityDates verifyStatus");

    // Adding user details and calculating days for each course
    const coursesWithUsersAndDays = courses.map((course) => {
      const daysArray = calculateDaysArray(course.startDate, course.endDate);

      return {
        ...course.toObject({ getters: true, virtuals: true }),
        users: course.userIds.map((userId) => {
          const user = userMap[userId];
          // Find the transaction for this user and course
          const transaction = transactions.find((trans) => trans.user_id.equals(userId) && trans.course_id.equals(course._id));
          const userCoursePurchaseDate = transaction ? transaction.datetime : null;
          return {
            ...user,
            userCoursePurchaseDate: userCoursePurchaseDate, // Add the purchase date
          };
        }),
        days: daysArray,
        course_image: course.course_image,
        purchaseDate: purchaseDateMap[course._id] || null,
      };
    });

    console.log("Number of unread notifications:", unreadCount);

    res.status(200).json({ courses: coursesWithUsersAndDays, notificationCount: unreadCount,teacherDetails });
  } catch (error) {
    console.error("Error fetching today's courses:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getMyClasses = asyncHandler(async (req, res) => {
  const teacher_id = req.headers.userID; // Assuming user authentication middleware sets this header
  const currentDate = new Date(); // Get current date
  const currentMonth = currentDate.getMonth() + 1;
  try {
    // Find courses where startDate matches the current month and teacher_id matches
    const courses = await Course.find({
      teacher_id,
      deleted_at: null,
      $or: [
        {
          $expr: { $eq: [{ $month: { $dateFromString: { dateString: "$startDate", format: "%Y/%m/%d" } } }, currentMonth] }
        },
        { startDate: null } // Include courses where startDate is null
      ]
    })
      .sort({ startTime: -1 }) // Sort by startTime descending order
      .exec();



    if (!courses || courses.length === 0) {
      return res.status(200).json({
        message: "Course Not Found",
        status: false,
      });
    }

    // Fetching only required fields from User collection
    const userIds = courses.reduce((acc, course) => {
      acc.push(...course.userIds);
      return acc;
    }, []);

    // Fetching transactions to get purchase dates
    const transactions = await Transaction.find({
      user_id: { $in: userIds },
      course_id: { $in: courses.map((course) => course._id) },
    }).exec();

    // Mapping transaction data to course IDs
    const purchaseDateMap = transactions.reduce((acc, transaction) => {
      acc[transaction.course_id] = transaction.datetime;
      return acc;
    }, {});

    const users = await User.find(
      { _id: { $in: userIds } },
      {
        profile_pic: 1,
        ConnectyCube_token: 1,
        ConnectyCube_id: 1,
        full_name: 1,
        firebase_token: 1,
      }
    );

    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user.toObject(); // Convert user to plain object
      return acc;
    }, {});

    const teacherDetails = await User.findById(teacher_id).select("teacherUnavailabilityDates verifyStatus");

    const coursesWithUsers = [];

    // Iterate over each course to add users and calculate days array
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];

      // Calculate days array between startDate and endDate
      const daysArray = calculateDaysArray(course.startDate, course.endDate);

      // Add user details to each course
      const courseWithUsers = {
        ...course.toObject({ getters: true, virtuals: true }),
        users: course.userIds.map((userId) => {
          const user = userMap[userId];
          // Find the transaction for this user and course
          const transaction = transactions.find((trans) => trans.user_id.equals(userId) && trans.course_id.equals(course._id));
          const userCoursePurchaseDate = transaction ? transaction.datetime : null;
          return {
            ...user,
            userCoursePurchaseDate: userCoursePurchaseDate, // Add the purchase date
          };
        }),
        days: daysArray,
        course_image: course.course_image,
        purchaseDate: purchaseDateMap[course._id] || null,
      };

      coursesWithUsers.push(courseWithUsers);
    }

    res.status(200).json({ courses: coursesWithUsers, teacherDetails });
  } catch (error) {
    console.error("Error fetching today's courses:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to send notifications to teachers 3 days before the course end date
const notifyTeachersAboutEndingCourses = async () => {
      try {
        // Get today's date and the date 3 days from now
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 3);

        const formattedTargetDate = formatDate(targetDate);

        // Find courses ending in 3 days
        const coursesEndingSoon = await Course.find({
          endDate: formattedTargetDate,
        });

        // Send notifications to the corresponding teachers
        for (const course of coursesEndingSoon) {
          const teacher = await User.findById(course.teacher_id);

          if (teacher && teacher.firebase_token) {
            const registrationToken = teacher.firebase_token;
            const title = "Course Ending Soon";
            const body = `Your course will end on ${course.endDate}. Please prepare accordingly.`;

            const notificationResult = await sendFCMNotification(registrationToken, title, body);
            if (notificationResult.success) {
              console.log(`Notification sent to ${teacher._id} successfully:`, notificationResult.response);
            } else {
              console.error(`Failed to send notification to ${teacher._id}:`, notificationResult.error);
            }

            // Add the notification to the teacher's notification collection
            await addNotification(null, teacher._id, body, title, null);
          }
        }

        console.log("Notification task completed successfully");
      } catch (error) {
        console.error("Error in notification task:", error.message);
      }
};

function calculateDaysArray(startDate, endDate) {
  const daysArray = [];
  let currentDate = new Date(startDate);
  let daysCount = 0;

  while (currentDate <= new Date(endDate) && daysCount < 21) {
    if (!isWeekend(currentDate)) {
      daysArray.push(formatDate(currentDate));
      daysCount++;
    }
    currentDate = addDays(currentDate, 1);
  }

  return daysArray;
}

// Helper function to format date in YYYY/MM/DD format
function formatDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}/${month}/${day}`;
}

// Helper function to calculate the start of the next month
function getNextMonthStart(date) {
  const d = new Date(date);
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return nextMonth;
}

// Function to calculate end date excluding weekends using date-fns
const calculateEndDate = (startDate, daysToAdd) => {
  let currentDay = new Date(startDate);
  let count = 0;

  while (count < daysToAdd) {
    currentDay = addDays(currentDay, 1);

    if (!isWeekend(currentDay)) {
      count++;
    }
  }

  return currentDay.toISOString().split("T")[0];
};

const CourseActiveStatus = async (req, res) => {
  const { course_id } = req.body;
  try {
    // Find the video by its _id
    const user = await Course.findById(course_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check if deleted_at field is null or has a value
    if (user.deleted_at === null) {
      const updatedUser = await Course.findByIdAndUpdate(
        course_id,
        {
          $set: {
            deleted_at: new Date(),
          },
        },
        { new: true }
      );

      const teacher_id = user.teacher_id;

      // Get the teacher information
      const teacher = await User.findById(teacher_id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      console.log("Deactivated");
      // Check if teacher has a firebase_token
      if (teacher.firebase_token) {
        const registrationToken = teacher.firebase_token;
        const title = `Course Deactivated`;
        const body = `Course has been deactivated.`;

        // Send notification
        const notificationResult = await sendFCMNotification(registrationToken, title, body);
        if (notificationResult.success) {
          console.log("Notification sent successfully:", notificationResult.response);
        } else {
          console.error("Failed to send notification:", notificationResult.error);
        }
        await addNotification(null, teacher_id, body, title, null);
      }
    } else {
      const updatedUser = await Course.findByIdAndUpdate(
        course_id,
        {
          $set: {
            deleted_at: null,
          },
        },
        { new: true }
      );
      const teacher_id = user.teacher_id;

      // Get the teacher information
      const teacher = await User.findById(teacher_id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      // Check if teacher has a firebase_token
      if (teacher.firebase_token) {
        const registrationToken = teacher.firebase_token;
        const title = `Course Activated`;
        const body = `Course has been activated.`;

        // Send notification
        const notificationResult = await sendFCMNotification(registrationToken, title, body);
        if (notificationResult.success) {
          console.log("Notification sent successfully:", notificationResult.response);
        } else {
          console.error("Failed to send notification:", notificationResult.error);
        }
        await addNotification(null, teacher_id, body, title, null);
      }
    }
    return res.status(200).json({
      message: "Course soft delete status toggled successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const autoDeactivateCourses = async () => {
  try {
    const currentDate = moment().startOf("day");
    // Find all courses with an endDate less than the current date and not already deactivated
    const coursesToDeactivate = await Course.find({
      endDate: { $lt: currentDate.format("YYYY/MM/DD") },
      deleted_at: null,
    });

    // Iterate over each course and deactivate it
    for (let course of coursesToDeactivate) {
      const updatedCourse = await Course.findByIdAndUpdate(
        course._id,
        {
          $set: {
            deleted_at: new Date(),
          },
        },
        { new: true }
      );

      // Get the teacher information
      const teacher = await User.findById(course.teacher_id);
      if (teacher && teacher.firebase_token) {
        const registrationToken = teacher.firebase_token;
        const title = `Course Deactivated`;
        const body = `The course has been automatically deactivated because the end date has passed.`;

        // Send notification
        const notificationResult = await sendFCMNotification(registrationToken, title, body);
        if (notificationResult.success) {
          console.log("Notification sent successfully:", notificationResult.response);
        } else {
          console.error("Failed to send notification:", notificationResult.error);
        }
      }
    }

    console.log("Courses with past end dates have been deactivated successfully.");
  } catch (error) {
    console.error("Error during auto deactivation of courses:", error);
  }
};

const teacherUnavailabilityDate = async (req,res) =>{
      try {
            const userId = req.headers.userID;
            const { teacherUnavailabilityDates } = req.body;

            if (!userId) {
              return res.status(400).json({ message: 'UserID is required in headers.' });
            }

            if (!Array.isArray(teacherUnavailabilityDates)) {
              return res.status(400).json({ message: 'teacherUnavailabilityDates should be an array.' });
            }

            // Find the user and update the teacherUnavailabilityDates field
            const updatedUser = await User.findByIdAndUpdate(
              userId,
              { teacherUnavailabilityDates },
              { new: true, runValidators: true } // Return the updated user and validate the data
            );

            if (!updatedUser) {
              return res.status(404).json({ message: 'User not found.' });
            }

            res.status(200).json({
              message: 'Unavailability dates updated successfully.',
              user: updatedUser
            });

          } catch (error) {
            console.error('Error updating unavailability dates:', error);
            res.status(500).json({ message: 'Server error.' });
          }
};

const getteacherUnavailabilityDateById = asyncHandler(async (req, res) => {
      const {userId} = req.body; // Assuming you have user authentication middleware

      try {
        // Find the user by ID
        const user = await User.findById({ _id: userId });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Return the user's profile information
        return res.status(200).json({
          teacherUnavailabilityDates: user.teacherUnavailabilityDates,
          verifyStatus: user.verifyStatus,
        });
      } catch (error) {
        console.error("Error fetching user details:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }
});

const updateTeacherDocument = async (req, res) => {
      const userID = req.headers.userID;
      req.uploadPath = "uploads/teacherDocument";

      upload.single("teacherDocument")(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ message: 'File upload error', error: err });
        }

        const { verifyStatus } = req.body;

        if (!userID) {
          return res.status(400).json({ message: 'User ID is required' });
        }

        try {
          const teacherDocument = req.file ? `${req.uploadPath}/${req.file.filename}` : null;
          const updatedUser = await User.findByIdAndUpdate(
            userID,
            {
              $set: {
                verifyStatus,
                teacherDocument
              }
            },
            { new: true, runValidators: true } // Return the updated document and run validators
          );

          if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
          }
          else{
            if (updatedUser.firebase_token) {
                  const registrationToken = updatedUser.firebase_token;
                  const title = `Profile Update Successfully`;
                  const body = `Your profile has been successfully updated. An admin will review and approve your profile shortly.`;

                  // Send notification
                  const notificationResult = await sendFCMNotification(registrationToken, title, body);
                  if (notificationResult.success) {
                    console.log("Notification sent successfully:", notificationResult.response);
                  } else {
                    console.error("Failed to send notification:", notificationResult.error);
                  }
                  await addNotification(null, updatedUser._id, body, title, null);
                }
          }

          res.status(200).json({ message: 'User updated successfully', data: updatedUser });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Internal server error', error });
        }
      });
};

const updateTeacherStatus = async (req, res) => {
      const { teacher_id, verifyStatus, type } = req.body;

      if (!teacher_id || !verifyStatus || !type) {
        return res.status(400).json({ message: 'Teacher ID, verify status, and type are required' });
      }

      try {
        // Update user verify status
        const updatedUser = await User.findByIdAndUpdate(
          teacher_id,
          { $set: { verifyStatus } },
          { new: true, runValidators: true }
        );

        if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Only proceed with payment updates if verifyStatus is 'approved'
        if (verifyStatus === 'approved') {
          const paymentTypes = {
            master: ['master_single', 'master_group'],
            advance: ['advance_single', 'advance_group'],
          };

          if (!Object.keys(paymentTypes).includes(type)) {
            return res.status(400).json({ message: "Invalid type. Must be 'master' or 'advance'." });
          }

          const paymentIds = await TeacherPayment.find({ type: { $in: paymentTypes[type] } }).exec();
          const paymentIdMap = paymentIds.reduce((acc, payment) => {
            acc[payment.type] = payment._id;
            return acc;
          }, {});

          if (paymentTypes[type].some(pt => !paymentIdMap[pt])) {
            return res.status(500).json({ message: "Some payment types are missing from the database." });
          }

          updatedUser.groupPaymentId = paymentIdMap[paymentTypes[type][1]];
          updatedUser.singlePaymentId = paymentIdMap[paymentTypes[type][0]];

          await updatedUser.save();

          const courses = await Course.find({ teacher_id });

          for (const course of courses) {
            console.log(course.payment_id);
            console.log(updatedUser.groupPaymentId);

            if (!course.paymentDetailsUpdated ) {
              let paymentDetails;
              if (course.type === 'group_course') {
                course.payment_id = updatedUser.groupPaymentId;
                paymentDetails = await TeacherPayment.findById(updatedUser.groupPaymentId);
              } else if (course.type === 'single_course') {
                course.payment_id = updatedUser.singlePaymentId;
                paymentDetails = await TeacherPayment.findById(updatedUser.singlePaymentId);
              }

              if (paymentDetails) {
                course.amount = Number(paymentDetails.amount);
                course.payment_type = paymentDetails.type;
              } else {
                course.amount = null;
                course.payment_type = null;
              }

               course.paymentDetailsUpdated = true;
              await course.save();
            }
          }
        }

        if (updatedUser.firebase_token) {
          const registrationToken = updatedUser.firebase_token;
          const title = `Profile Update Successfully`;
          const body = `Your profile has been ${verifyStatus} by the admin`;

          const notificationResult = await sendFCMNotification(registrationToken, title, body);
          if (!notificationResult.success) {
            console.error("Failed to send notification:", notificationResult.error);
          }
          await addNotification(null, updatedUser._id, body, title, null);
        }

        res.status(200).json({ message: 'Verify status updated successfully', data: updatedUser });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error });
      }
};



module.exports = { updateTeacherProfileData, addCourse, getTodayCourse, getMyClasses, getTeacherProfileData, updateCourseDates, getTeacherProfileDataByTeacherId, CourseActiveStatus, autoDeactivateCourses, teacherUnavailabilityDate, updateTeacherDocument, getteacherUnavailabilityDateById, notifyTeachersAboutEndingCourses, updateTeacherStatus };
