const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const { User, NotificationMessages, AdminDashboard, WebNotification } = require("../models/userModel.js");
const dotenv = require("dotenv");
const baseURL = process.env.BASE_URL;
const ErrorHandler = require("../utils/errorHandler.js");
const http = require("https");
const Course = require("../models/course.js");
const ConnectyCube = require("connectycube");
const upload = require("../middleware/uploadMiddleware.js");
const fs = require("fs");

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

// POST /api/courses/add

// const CREDENTIALS = {
//   appId: process.env.CAPPID,
//   authKey: process.env.AUTHKEY,
//   authSecret: process.env.AUTHSECRET,
// };

// const CONFIG = {
//   debug: { mode: 1 },
// };

// // Initialize ConnectyCube
// ConnectyCube.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret, CONFIG);

// const updateConnectyCubeUser = async (connectyCubeId, userProfile, sessionToken) => {
//   try {
//     const updatedUser = await ConnectyCube.users.update(connectyCubeId, userProfile, [{ token: sessionToken }]);
//     console.log("ConnectyCube user updated successfully:", updatedUser);
//     return updatedUser;
//   } catch (error) {
//     console.error("Error updating user profile in ConnectyCube:", error);
//     throw new ErrorHandler("Failed to update user profile in ConnectyCube", 500);
//   }
// };

// const updateTeacherProfileData = asyncHandler(async (req, res) => {
//   const { full_name, mobile, email, experience, education, languages, expertise, about_me } = req.body;
//   const userId = req.headers.userID; // Assuming user authentication middleware sets this header

//   try {
//     // Update the user's profile fields in the local database
//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       {
//         $set: {
//           full_name,
//           mobile,
//           email,
//           experience,
//           education,
//           languages,
//           expertise,
//           about_me,
//           datetime: moment().tz("Asia/Kolkata").format("YYYY-MMM-DD hh:mm:ss A"),
//         },
//       },
//       { new: true }
//     );

//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Prepare user profile update for ConnectyCube
//     const userProfileUpdate = {
//       login: mobile,
//       full_name,
//       email,
//       phone: mobile,
//       // Add other fields as needed
//     };

//     // Get session token from wherever it's stored (e.g., database, session)
//     const sessionToken = updatedUser.ConnectyCube_token;

//     // Update user profile in ConnectyCube
//     const updatedConnectyCubeUser = await updateConnectyCubeUser(updatedUser.ConnectyCube_id, userProfileUpdate, sessionToken);

//     return res.status(200).json({
//       _id: updatedUser._id,
//       full_name: updatedUser.full_name,
//       mobile: updatedUser.mobile,
//       email: updatedUser.email,
//       experience: updatedUser.experience,
//       education: updatedUser.education,
//       languages: updatedUser.languages,
//       expertise: updatedUser.expertise,
//       about_me: updatedUser.about_me,
//       pic: updatedUser.profile_pic,
//       status: true,
//     });
//   } catch (error) {
//     console.error("Error updating user profile:", error.message);
//     return res.status(error.statusCode || 500).json({ error: error.message });
//   }
// });

const addCourse = asyncHandler(async (req, res) => {
  const { title, category_id, sub_category_id, type, startTime, endTime, startDate, endDate } = req.body;
  const teacher_id = req.headers.userID; // Assuming user authentication middleware sets this header

  try {
    // Validate required fields
    if (!title || !category_id || !sub_category_id || !type) {
      return res.status(400).json({
        error: "All fields (title, category_id, sub_category_id, type) are required.",
      });
    }

    // Validate startDate and endDate are valid dates
    if (!startDate || !endDate || isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      return res.status(400).json({
        error: "Invalid startDate or endDate format.",
      });
    }

    // Create new course with provided dates
    const newCourse = new Course({
      title,
      category_id,
      sub_category_id,
      type,
      startTime,
      endTime,
      startDate: new Date(startDate), // Convert startDate string to Date object
      endDate: new Date(endDate), // Convert endDate string to Date object
      teacher_id,
    });

    const savedCourse = await newCourse.save();

    res.status(201).json({
      _id: savedCourse._id,
      title: savedCourse.title,
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

const getTodayCourse = asyncHandler(async (req, res) => {
  const userId = req.headers.userID;
  const currentDateTime = moment().tz("Asia/Kolkata");
  const currentMonth = currentDateTime.format("MM");
  const currentYear = currentDateTime.format("YYYY");
  const currentTime = currentDateTime.format("hh:mm A");

  try {
    const courses = await Course.find({
      teacher_id: userId,
      startDate: {
        $gte: `01-${currentMonth}-${currentYear}`,
        $lte: `31-${currentMonth}-${currentYear}`,
      },
    });

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        message: "Course Not Found",
        status: false,
      });
    }

    const filteredCourses = courses.filter((course) => {
      const courseStartTime = moment(course.startTime, "hh:mm A").format("hh:mm A");
      const currentTimeOnly = moment(currentTime, "hh:mm A").format("hh:mm A");
      return moment(courseStartTime, "hh:mm A").isAfter(moment(currentTimeOnly, "hh:mm A"));
    });

    res.json({
      course: filteredCourses,
      status: true,
    });
  } catch (error) {
    console.error("GetTodayCourse API error:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getMyClasses = asyncHandler(async (req, res) => {
  const userId = req.headers.userID;
  const currentDateTime = moment().tz("Asia/Kolkata");
  const currentMonth = currentDateTime.format("MM");
  const currentYear = currentDateTime.format("YYYY");
  const currentTime = currentDateTime.format("hh:mm A");

  try {
    const courses = await Course.find({
      teacher_id: userId,
      startDate: {
        $gte: `01-${currentMonth}-${currentYear}`,
        $lte: `31-${currentMonth}-${currentYear}`,
      },
    });

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        message: "Course Not Found",
        status: false,
      });
    }

    res.json({
      course: courses,
      status: true,
    });
  } catch (error) {
    console.error("GetTodayCourse API error:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

module.exports = { updateTeacherProfileData, addCourse, getTodayCourse, getMyClasses, getTeacherProfileData };
