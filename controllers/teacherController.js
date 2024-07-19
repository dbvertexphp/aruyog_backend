const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const axios = require("axios");
const bcrypt = require("bcryptjs");
// const moment = require("moment-timezone");
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
    const user = await User.findById(userId);
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
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      mobile: user.mobile,
      email: user.email,
      experience: user.experience,
      education: user.education,
      languages: user.languages,
      expertise: user.expertise,
      about_me: user.about_me,
      background_image: user.background_image,
      profile_pic: user.profile_pic,
      status: true,
      payment: paymentDetails,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const getTeacherProfileDataByTeacherId = asyncHandler(async (req, res) => {
  const { teacher_id } = req.body; // Assuming you have user authentication middleware

  try {
    // Find the user by ID
    const user = await User.findById(teacher_id);
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
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      mobile: user.mobile,
      email: user.email,
      experience: user.experience,
      education: user.education,
      languages: user.languages,
      expertise: user.expertise,
      about_me: user.about_me,
      background_image: user.background_image,
      profile_pic: user.profile_pic,
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

const addCourse = asyncHandler(async (req, res) => {
  req.uploadPath = "uploads/course";
  upload.single("course_image")(req, res, async (err) => {
    if (err) {
      return next(new ErrorHandler(err.message, 400));
    }
    const { title, category_id, sub_category_id, type, startTime, endTime, startDate } = req.body;
    const teacher_id = req.headers.userID; // Assuming user authentication middleware sets this header

    try {
      // Validate required fields
      if (!title || !category_id || !sub_category_id || !type || !startTime || !endTime || !startDate) {
        return res.status(400).json({
          error: "All fields (title, category_id, sub_category_id, type, startTime, endTime, startDate) are required.",
        });
      }

      // Validate and parse startDate
      const parsedStartDate = new Date(startDate.replace(/\//g, "-")); // Replace "/" with "-" for correct parsing
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY/MM/DD." });
      }

      // Calculate start and end of the month based on startDate
      const startOfMonth = new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth(), 1);
      const endOfMonth = new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth() + 1, 0);

      // Check if the teacher has already added 6 courses this month
      const coursesCount = await Course.countDocuments({
        teacher_id,
        startDate: { $gte: formatDate(startOfMonth), $lte: formatDate(endOfMonth) }, // Count documents within the current month
      });

      if (coursesCount >= 6) {
        const nextMonthStart = getNextMonthStart(parsedStartDate);
        return res.status(400).json({
          error: `Teacher cannot add more than 6 courses in a month. Next available date to add courses: ${formatDate(nextMonthStart)}.`,
        });
      }

      // Check if the course types are valid for the current month
      const courses = await Course.find({
        teacher_id,
        startDate: { $gte: formatDate(startOfMonth), $lte: formatDate(endOfMonth) }, // Only consider courses in the current month
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

      // Calculate end date excluding weekends
      const endDate = calculateEndDate(startDate, 21); // Excluding weekends
      const formattedStartDate = formatDate(startDate);
      const formattedEndDate = formatDate(endDate);

      // Get the profile picture path if uploaded
      const course_image = req.file ? `${req.uploadPath}/${req.file.filename}` : null;

      // Create new course with parsed dates
      const newCourse = new Course({
        title,
        course_image,
        category_id,
        sub_category_id,
        type,
        startTime,
        endTime,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        teacher_id,
      });

      const savedCourse = await newCourse.save();

      res.status(201).json({
        _id: savedCourse._id,
        title: savedCourse.title,
        course_image: savedCourse.course_image,
        category_id: savedCourse.category_id,
        sub_category_id: savedCourse.sub_category_id,
        type: savedCourse.type,
        startTime: savedCourse.startTime,
        endTime: savedCourse.endTime,
        startDate: savedCourse.startDate,
        endDate: savedCourse.endDate,
        teacher_id: savedCourse.teacher_id,
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
    console.log(course);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Calculate new end date excluding weekends
    const newEndDate = calculateEndDate(newStartDate, 21); // Excluding weekends
    const formattedNewStartDate = formatDate(newStartDate);
    const formattedNewEndDate = formatDate(newEndDate);

    console.log(formattedNewStartDate);
    console.log(formattedNewEndDate);

    // Update course with new dates
    course.startDate = formattedNewStartDate;
    course.endDate = formattedNewEndDate;

    const updatedCourse = await course.save();

    res.status(200).json({
      _id: updatedCourse._id,
      title: updatedCourse.title,
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
      startDate: { $lte: formattedCurrentDate },
      endDate: { $gte: formattedCurrentDate },
      userIds: { $ne: [] },
    })
      .sort({ startTime: 1 }) // Sort by startTime ascending order
      .exec();

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        message: "Course Not Found",
        status: false,
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
      acc[user._id] = user;
      return acc;
    }, {});

    // Adding user details and calculating days for each course
    const coursesWithUsersAndDays = courses.map((course) => {
      const daysArray = calculateDaysArray(course.startDate, course.endDate);

      return {
        ...course.toObject({ getters: true, virtuals: true }),
        users: course.userIds.map((userId) => userMap[userId]),
        days: daysArray,
        course_image: course.course_image,
        purchaseDate: purchaseDateMap[course._id] || null,
      };
    });

    res.status(200).json({ courses: coursesWithUsersAndDays });
  } catch (error) {
    console.error("Error fetching today's courses:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getMyClasses = asyncHandler(async (req, res) => {
  const teacher_id = req.headers.userID; // Assuming user authentication middleware sets this header
  const currentDate = new Date(); // Get current date
  const formattedCurrentDate = formatDate(currentDate); // Format date to YYYY/MM/DD

  try {
    // Find courses where startDate matches the current date and teacher_id matches
    const courses = await Course.find({
      teacher_id,
      startDate: { $lte: formattedCurrentDate }, // Format current date to match stored
      endDate: { $gte: formattedCurrentDate },
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
      acc[user._id] = user;
      return acc;
    }, {});

    const coursesWithUsers = [];

    // Iterate over each course to add users and calculate days array
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];

      // Calculate days array between startDate and endDate
      const daysArray = calculateDaysArray(course.startDate, course.endDate);

      // Add user details to each course
      const courseWithUsers = {
        ...course.toObject({ getters: true, virtuals: true }),
        users: course.userIds.map((userId) => userMap[userId]),
        days: daysArray,
        course_image: course.course_image,
        purchaseDate: purchaseDateMap[course._id] || null,
      };

      coursesWithUsers.push(courseWithUsers);
    }

    res.status(200).json({ courses: coursesWithUsers });
  } catch (error) {
    console.error("Error fetching today's courses:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

module.exports = { updateTeacherProfileData, addCourse, getTodayCourse, getMyClasses, getTeacherProfileData, updateCourseDates, getTeacherProfileDataByTeacherId };
