const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const { generateToken, blacklistToken } = require("../config/generateToken.js");
const { User, NotificationMessages, AdminDashboard, WebNotification } = require("../models/userModel.js");
const { Reel, ReelLike, ReelComment } = require("../models/reelsModel.js");
const { Video, VideoLike, VideoComment } = require("../models/videoModel.js");
const { PostTimeline } = require("../models/posttimelineModel.js");
const { PostJob } = require("../models/postjobModel.js");
const Category = require("../models/categoryModel.js");
const Review = require("../models/reviewModel.js");
const BankDetails = require("../models/bankdetailsModel.js");
const Transaction = require("../models/transactionModel");
const { AdminNotificationMessages } = require("../models/adminnotificationsmodel.js");
const multer = require("multer");
const MyFriends = require("../models/myfrindsModel.js");
const { Hire, HireStatus } = require("../models/hireModel.js");
const dotenv = require("dotenv");
const baseURL = process.env.BASE_URL;
const { createNotification } = require("./notificationControllers.js");
const { PutObjectProfilePic, getSignedUrlS3, DeleteSignedUrlS3 } = require("../config/aws-s3.js");
const dayjs = require("dayjs");
const { createConnectyCubeUser } = require("../utils/connectyCubeUtils.js");
const ErrorHandler = require("../utils/errorHandler.js");
const http = require("https");
const Course = require("../models/course.js");
const ConnectyCube = require("connectycube");
dotenv.config();
const updateTeacherProfileData = asyncHandler(async (req, res) => {
  const { full_name, mobile, email, experience, education, languages, expertise, about_me } = req.body;

  const userId = req.headers.userID; // Assuming you have user authentication middleware

  try {
    // Update the user's profile fields if they are provided in the request
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          full_name: full_name,
          mobile: mobile,
          email: email,
          experience: experience,
          education: education,
          languages: languages,
          expertise: expertise,
          about_me: about_me,
          datetime: moment().tz("Asia/Kolkata").format("YYYY-MMM-DD hh:mm:ss A"),
        },
      },
      { new: true }
    ); // Option to return the updated document

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      _id: updatedUser._id,
      full_name: updatedUser.full_name,
      mobile: updatedUser.mobile,
      email: updatedUser.email,
      experience: updatedUser.experience,
      education: updatedUser.education,
      languages: updatedUser.languages,
      expertise: updatedUser.expertise,
      about_me: updatedUser.about_me,
      pic: updatedUser.pic,
      status: true,
    });
  } catch (error) {
    console.error("Error updating user profile:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/courses/add

const CREDENTIALS = {
  appId: process.env.CAPPID,
  authKey: process.env.AUTHKEY,
  authSecret: process.env.AUTHSECRET,
};

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
  const { title, category_id, sub_category_id, type, startTime, endTime } = req.body;
  const teacher_id = req.headers.userID; // Assuming user authentication middleware sets this header

  try {
    // Parse dates
    const parsedStartTime = moment(startTime, "DD/MM/YYYY").toDate();
    const parsedEndTime = moment(endTime, "DD/MM/YYYY").toDate();

    const newCourse = new Course({
      title,
      category_id,
      sub_category_id,
      type,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
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
      teacher_id: savedCourse.teacher_id,
      status: true,
    });
  } catch (error) {
    console.error("Error adding course:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = { updateTeacherProfileData, addCourse };
