const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const moment = require("moment");

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
require("dotenv").config();
const baseURL = process.env.BASE_URL;
const { createNotification } = require("./notificationControllers.js");
const { PutObjectProfilePic, getSignedUrlS3, DeleteSignedUrlS3 } = require("../config/aws-s3.js");
const dayjs = require("dayjs");
const { createConnectyCubeUser } = require("../utils/connectyCubeUtils.js");
const ErrorHandler = require("../utils/errorHandler.js");
const http = require("https");
const jwt = require("jsonwebtoken");
const upload = require("../middleware/uploadMiddleware.js");
const Course = require("../models/course.js");
const TeacherPayment = require("../models/TeacherPaymentModel.js");
const Favorite = require("../models/favorite.js");
const Rating = require("../models/ratingModel.js");
const fs = require("fs");
const { startOfMonth, endOfMonth, addMonths, format, parse } = require("date-fns");

const getUsers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({
        message: "User Not Found",
        status: false,
      });
    }

    // Convert dob to desired format using dayjs
    const formattedDOB = dayjs(user.dob).format("YYYY-MM-DD");

    const updatedUser = {
      ...user._doc,
      pic: user.pic,
      watch_time: convertSecondsToReadableTime(user.watch_time),
      dob: formattedDOB, // Update dob with formatted date
    };

    res.json({
      user: updatedUser,
      status: true,
    });
  } catch (error) {
    console.error("GetUsers API error:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

// const getUserView = asyncHandler(async (req, res) => {
//       const user_id = req.params;

//       try {
//             // Fields jo query se exclude karna hai ko specify karein
//             const excludedFields = [
//                   "otp_verified",
//                   "mobile",
//                   "password",
//                   "otp",
//             ];

//             // Exclude karne wale fields ke liye projection object banayein
//             const projection = {};
//             excludedFields.forEach((field) => {
//                   projection[field] = 0;
//             });

//             // User ko user_id ke basis par find karein aur specified fields ko exclude karke select karein
//             const user = await User.findById(user_id).select(projection);
//             console.log(user);

//             // Agar user nahi mila, toh User Not Found ka response bhejein
//             if (!user) {
//                   return res.status(200).json({
//                         message: "User Not Found",
//                         status: false,
//                   });
//             }

//             // Friend_status ko "No" se set karein
//             let Friend_status = "No";

//             // Token header mein present hai ya nahi check karein
//             const token = req.header("Authorization");
//             if (token) {
//                   // Check karein ki user ne current post ko like kiya hai ya nahi
//                   const isFriend = await MyFriends.exists({
//                         $or: [
//                               { my_id: req.user._id, friends_id: user_id._id },
//                               { my_id: user_id._id, friends_id: req.user._id },
//                         ],
//                   });

//                   const isRequestPending = await MyFriends.exists({
//                         my_id: user_id._id,
//                         request_id: req.user._id,
//                   });
//                   const isRequestAccept = await MyFriends.exists({
//                         my_id: req.user._id,
//                         request_id: user_id._id,
//                   });

//                   // User ne post ko like kiya hai ya nahi, is par based Friend_status set karein
//                   if (isFriend) {
//                         Friend_status = "Yes";
//                   } else if (isRequestPending) {
//                         Friend_status = "Pending";
//                   } else if (isRequestAccept) {
//                         Friend_status = "Accept";
//                   }
//             }

//             // User ke pic field mein BASE_URL append karein
//             const updatedUser = {
//                   Friend_status,
//                   ...user._doc,
//                   pic: user.pic,
//                   watch_time: convertSecondsToReadableTime(user.watch_time),
//             };

//             // Response mein updatedUser aur status ka json bhejein
//             res.json({
//                   user: updatedUser,
//                   status: true,
//             });
//       } catch (error) {
//             // Agar koi error aaye toh usko console mein log karein aur Internal Server Error ka response bhejein
//             console.error("GetUsers API error:", error.message);
//             res.status(500).json({
//                   message: "Internal Server Error",
//                   status: false,
//             });
//       }
// });

const getUserView = asyncHandler(async (req, res) => {
  const user_id = req.params;

  try {
    // Fields jo query se exclude karna hai ko specify karein
    const excludedFields = ["otp_verified", "mobile", "password", "otp"];

    // Exclude karne wale fields ke liye projection object banayein
    const projection = {};
    excludedFields.forEach((field) => {
      projection[field] = 0;
    });

    // User ko user_id ke basis par find karein aur specified fields ko exclude karke select karein
    const user = await User.findById(user_id).select(projection);

    // Agar user nahi mila, toh User Not Found ka response bhejein
    if (!user) {
      return res.status(200).json({
        message: "User Not Found",
        status: false,
      });
    }

    // Friend_status ko "No" se set karein
    let Friend_status = "No";

    // Token header mein present hai ya nahi check karein
    const token = req.header("Authorization");
    if (token) {
      // Check karein ki user ne current post ko like kiya hai ya nahi
      const isFriend = await MyFriends.exists({
        $or: [
          { my_id: req.user._id, friends_id: user_id._id },
          { my_id: user_id._id, friends_id: req.user._id },
        ],
      });

      const isRequestPending = await MyFriends.exists({
        my_id: user_id._id,
        request_id: req.user._id,
      });
      const isRequestAccept = await MyFriends.exists({
        my_id: req.user._id,
        request_id: user_id._id,
      });

      // User ne post ko like kiya hai ya nahi, is par based Friend_status set karein
      if (isFriend) {
        Friend_status = "Yes";
      } else if (isRequestPending) {
        Friend_status = "Pending";
      } else if (isRequestAccept) {
        Friend_status = "Accept";
      }
    }

    // User ke pic field mein BASE_URL append karein
    const updatedUser = {
      Friend_status,
      ...user._doc,
      pic: user.pic,
      watch_time: convertSecondsToReadableTime(user.watch_time),
    };
    console.log(updatedUser);

    // Response mein updatedUser aur status ka json bhejein
    res.json({
      user: updatedUser,
      status: true,
    });
  } catch (error) {
    // Agar koi error aaye toh usko console mein log karein aur Internal Server Error ka response bhejein
    console.error("GetUsers API error:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const sendOTP = (mobile, name, otp) => {
  // Ensure mobile number is in international format
  const formattedMobile = `91${mobile}`; // Assuming country code is 91 (India)

  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    port: null,
    path: `/api/v5/otp?template_id=667933e0d6fc0563602dae12&mobile=${formattedMobile}&authkey=418124AsbkkEdM65f1c681P1`,
    headers: {
      "Content-Type": "application/JSON",
    },
  };

  const req = http.request(options, function (res) {
    const chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      const body = Buffer.concat(chunks);
      console.log("MSG91 Response:", body.toString());
    });
  });

  req.on("error", (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  const postData = JSON.stringify({
    name: name,
    otp: otp,
  });

  console.log("Sending OTP:", postData);
  req.write(postData);
  req.end();
};

const registerUser = asyncHandler(async (req, res, next) => {
  req.uploadPath = "uploads/profiles";
  upload.single("profile_pic")(req, res, async (err) => {
    if (err) {
      return next(new ErrorHandler(err.message, 400));
    }

    const { first_name, last_name, email, mobile, password, cpassword, role } = req.body;
    if (!first_name || !last_name || !email || !mobile || !password || !cpassword || !role) {
      return next(new ErrorHandler("Please enter all the required fields.", 400));
    }
    if (password !== cpassword) {
      return next(new ErrorHandler("Password and Confirm Password do not match.", 400));
    }

    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return next(new ErrorHandler("User with this mobile number already exists.", 400));
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new ErrorHandler("User with this Email already exists.", 400));
    }

    // Generate a 4-digit random OTP
    const otp = generateOTP();
    const full_name = `${first_name} ${last_name}`;

    const { token, id } = await createConnectyCubeUser(mobile, password, email, full_name, role);

    // Get the profile picture path if uploaded
    const profile_pic = req.file ? `${req.uploadPath}/${req.file.filename}` : null;

    const user = await User.create({
      first_name,
      last_name,
      email,
      mobile,
      role,
      password,
      otp, // Add the OTP field
      full_name,
      profile_pic, // Add profile_pic field
      ConnectyCube_token: token,
      ConnectyCube_id: id,
    });

    if (user) {
      // Send OTP to user's mobile
      // sendOTP(mobile, full_name, otp);

      // Increment user_count in AdminDashboard
      try {
        const adminDashboard = await AdminDashboard.findOne();
        if (adminDashboard) {
          adminDashboard.user_count++;
          await adminDashboard.save();
        } else {
          console.error("AdminDashboard not found");
        }
      } catch (error) {
        console.error("Failed to update admin dashboard:", error);
      }

      res.status(201).json({
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        otp_verified: user.otp_verified,
        profile_pic: user.profile_pic, // Include profile_pic in response
        ConnectyCube_token: user.ConnectyCube_token,
        ConnectyCube_id: user.ConnectyCube_id,
        token: generateToken(user._id),
        status: true,
      });
    } else {
      return next(new ErrorHandler("User registration failed.", 400));
    }
  });
});

const authUser = asyncHandler(async (req, res) => {
  const { mobile, password, firebase_token } = req.body; // Include firebase_token from request body
  const userdata = await User.findOne({ mobile });

  if (!userdata) {
    throw new ErrorHandler("User Not Found.", 400);
  }

  const isPasswordMatch = await userdata.matchPassword(password);

  if (!isPasswordMatch) {
    throw new ErrorHandler("Invalid Password", 400);
  }

  if (userdata.otp_verified === 0) {
    const otp = generateOTP();
    await User.updateOne({ _id: userdata._id }, { $set: { otp } });
    throw new ErrorHandler("OTP Not verified", 400);
  }

  // Save firebase_token if provided
  if (firebase_token) {
    userdata.firebase_token = firebase_token;
    await userdata.save();
  }

  if (isPasswordMatch) {
    if (!process.env.JWT_SECRET) {
      throw new ErrorHandler("JWT_SECRET is not defined in environment variables", 500);
    }

    const token = jwt.sign({ _id: userdata._id, role: userdata.role }, process.env.JWT_SECRET);

    // Set the token in a cookie for 30 days
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("Websitetoken", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000), // 30 days
        path: "/",
      })
    );

    const user = {
      ...userdata._doc,
      profile_pic: userdata.profile_pic ? `${req.protocol}://${req.get("host")}/${userdata.profile_pic}` : null,
    };

    res.json({
      user,
      token,
      status: true,
    });
  } else {
    throw new ErrorHandler("Invalid Password", 400);
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Extract token from "Bearer {token}"

    blacklistToken(token);

    // Expire the cookie immediately
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("Websitetoken", "", {
        httpOnly: false,
        expires: new Date(0),
        path: "/",
      })
    );

    res.json({ message: "Logout successful", status: true });
  } else {
    res.status(200).json({ message: "Invalid token", status: false });
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  try {
    const user = await User.findOne({ mobile });

    if (!user) {
      throw new ErrorHandler("User Not Found. ", 400);
    }

    if (user.otp_verified) {
      throw new ErrorHandler("User is already OTP verified.", 400);
    }

    // Check if the provided OTP matches the OTP in the user document
    if (user.otp !== otp) {
      throw new ErrorHandler("Invalid OTP.", 400);
    }

    // Update the user's otp_verified field to 1 (OTP verified)
    const result = await User.updateOne({ _id: user._id }, { $set: { otp_verified: 1 } });

    if (result.nModified > 0) {
      console.log("OTP verification status updated successfully.");
    } else {
      console.log("No matching user found or OTP verification status already set.");
    }

    // Retrieve the updated user document
    const updatedUser = await User.findById(user._id);

    res.json({
      user: updatedUser,
      token: generateToken(updatedUser._id),
      status: true,
    });
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
});

const resendOTP = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  // Generate a new OTP
  const newOTP = generateOTP();

  // Find the user by mobile number
  const user = await User.findOne({ mobile });

  //   const type = "Resend";
  //   TextLocalApi(type, user.first_name, mobile, newOTP);
  if (!user) {
    throw new ErrorHandler("User Not Found. ", 400);
  }

  // Update the user's otp field with the new OTP
  const result = await User.updateOne({ _id: user._id }, { $set: { otp: newOTP } });

  // Send the new OTP to the user (you can implement this logic)

  res.json({
    message: "New OTP sent successfully.",
    status: true,
  });
});
const ForgetresendOTP = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  const userdata = await User.findOne({ mobile: mobile });

  if (!userdata) {
    throw new ErrorHandler("Mobile Number Not Found", 400);
  }
  // Generate a new OTP
  const newOTP = generateOTP();

  // Find the user by mobile number
  const user = await User.findOne({ mobile });

  //   const type = "Forget_Password";
  //   TextLocalApi(type, user.first_name, mobile, newOTP);
  //   if (!user) {
  //     res.status(200).json({
  //       message: "User Not Found.",
  //       status: false,
  //     });
  //     return;
  //   }

  const result = await User.updateOne({ _id: user._id }, { $set: { otp: newOTP } });

  // Send the new OTP to the user (you can implement this logic)

  res.status(200).json({
    message: "New OTP sent successfully.",
    status: true,
  });
});

// Set up multer storage and file filter
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/profiles"); // Specify the directory where uploaded files will be stored
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + "-" + file.originalname); // Define the filename for the uploaded file
//   },
// });

// const upload = multer({ storage: storage });

const profilePicUpload = asyncHandler(async (req, res) => {
  // upload.single("profilePic")(req, res, async (err) => {
  //   if (err) {
  //     // Handle file upload error
  //     throw new ErrorHandler("File upload error", 400);
  //   }
  //   const userId = req.user._id; // Assuming you have user authentication middleware
  //   // Check if the user exists
  //   const user = await User.findById(userId);
  //   if (!user) {
  //     throw new ErrorHandler("User not found", 400);
  //   }
  //   //     const pic_name_url = await getSignedUrlS3(user.pic);
  //   // Update the user's profile picture (if uploaded)
  //   if (req.file) {
  //     const uploadedFileName = req.file.filename;
  //     user.pic = "uploads/profiles/" + uploadedFileName;
  //     await user.save();
  //     return res.status(200).json({
  //       message: "Profile picture uploaded successfully",
  //       pic: user.pic,
  //       status: true,
  //     });
  //   }
  //   throw new ErrorHandler("No file uploaded", 400);
  // });
});
const profilePicKey = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Assuming you have user authentication middleware
  const profilePicKeys = req.body.profilePicKey;
  // Check if the user exists
  const user = await User.findById(userId);

  if (!user) {
    return res.status(200).json({ message: "User not found" });
  }
  // Update the user's profile picture (if uploaded)
  user.pic = profilePicKeys;
  await user.save();
  const pic_name_url = await getSignedUrlS3(user.pic);
  return res.status(200).json({
    message: "Profile picture uploaded successfully",
    pic: pic_name_url,
    status: true,
  });
  return res.status(200).json({ message: "No file uploaded" });
});

const updateProfileData = asyncHandler(async (req, res) => {
  const { interest, about_me, last_name, first_name, dob, address } = req.body;

  const userId = req.user._id; // Assuming you have user authentication middleware
  const full_name = `${first_name} ${last_name}`;

  console.log(dob);

  try {
    // Update the user's profile fields if they are provided in the request
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          interest: interest,
          about_me: about_me,
          last_name: last_name,
          first_name: first_name,
          dob: dob,
          address: address,
          full_name: full_name,
        },
      },
      { new: true }
    ); // Option to return the updated document

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      _id: updatedUser._id,
      interest: updatedUser.interest,
      about_me: updatedUser.about_me,
      address: updatedUser.address,
      last_name: updatedUser.last_name,
      first_name: updatedUser.first_name,
      dob: updatedUser.dob,
      pic: updatedUser.pic,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      username: updatedUser.username,
      status: true,
    });
  } catch (error) {
    console.error("Error updating user profile:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const forgetPassword = asyncHandler(async (req, res) => {
  const { newPassword, mobile, otp } = req.body;

  if (!newPassword || !mobile || !otp) {
    res.status(200).json({
      message: "Please enter all the required fields.",
      status: false,
    });
    return;
  }

  // Find the user by _id
  const user = await User.findOne({ mobile });

  if (!user) {
    res.status(200).json({
      message: "User Not Found.",
      status: false,
    });
    return;
  }
  if (user.otp !== otp) {
    res.status(200).json({
      message: "Invalid OTP.",
      status: false,
    });
    return;
  }

  user.password = newPassword;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

  // Save the updated user with the new password
  res.json({
    message: "Password reset successfully.",
    status: true,
  });
});

const ChangePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ErrorHandler("Please enter all the required fields.", 400);
  }
  const userId = req.headers.userID; // Assuming you have user authentication middleware

  // Find the user by _id
  const user = await User.findById(userId);
  if (!user) {
    throw new ErrorHandler("User Not Found.", 400);
  }

  // Check if the provided old password matches the current password
  const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordCorrect) {
    throw new ErrorHandler("Incorrect old password.", 400);
  }

  // Check if the new password is the same as the old one
  const isNewPasswordSameAsOld = await bcrypt.compare(newPassword, user.password);
  if (isNewPasswordSameAsOld) {
    throw new ErrorHandler("New password must be different from the old password.", 400);
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

  res.status(201).json({
    message: "Password changed successfully.",
    status: true,
  });
});

const bank_Detail_create = asyncHandler(async (req, res) => {
  const { bankName, accountNumber, ifscCode, bankAddress, teacherName } = req.body;
  const userId = req.headers.userID; // Assuming you have user authentication middleware

  try {
    // Create bank details
    const bankDetails = await BankDetails.create({
      bankName,
      accountNumber,
      ifscCode,
      bankAddress,
      teacherName,
      userId,
    });
    res.status(201).json({
      bankDetails,
      status: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getBankDetails = asyncHandler(async (req, res) => {
  const userId = req.headers.userID; // Assuming you have user authentication middleware

  try {
    // Find bank details for the given user ID
    const bankDetails = await BankDetails.findOne({ userId });

    if (bankDetails) {
      res.status(200).json({
        bankDetails,
        status: true,
      });
    } else {
      res.status(200).json({
        message: "Bank details not found for the user",
        status: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getBankDetailsAdmin = asyncHandler(async (req, res) => {
  const userId = req.body._id; // Assuming you have user authentication middleware

  try {
    // Find bank details for the given user ID
    const bankDetails = await BankDetails.findOne({ userId });

    if (bankDetails) {
      res.status(200).json({
        bankDetails,
        status: true,
      });
    } else {
      res.status(200).json({
        bankDetails,
        status: true,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

// const getAllUsers = asyncHandler(async (req, res) => {
//       const { page = 1, search = "", Short = "" } = req.body;
//       const perPage = 10; // You can adjust this according to your requirements

//       // Build the query based on search and Short
//       const query = search
//             ? {
//                     $or: [
//                           { first_name: { $regex: search, $options: "i" } },
//                           { email: { $regex: search, $options: "i" } },
//                           { last_name: { $regex: search, $options: "i" } },
//                     ],
//               }
//             : {};

//       // Sorting based on Short field
//       let sortCriteria = {};
//       if (Short === "Review") {
//             sortCriteria = { review: -1 }; // Sort by review in descending order
//       } else if (Short === "watch_time") {
//             sortCriteria = { watch_time: -1 }; // Sort by watch_time in descending order
//       } else if (Short === "Subscribe") {
//             sortCriteria = { subscribe: -1 }; // Sort by subscribe in descending order
//       } else {
//             sortCriteria = { _id: -1 }; // Default sorting
//       }

//       try {
//             const users = await User.find(query)
//                   .sort(sortCriteria)
//                   .skip((page - 1) * perPage)
//                   .limit(perPage);

//             const totalCount = await User.countDocuments(query);
//             const totalPages = Math.ceil(totalCount / perPage);
//             console.log(users);

//             const transformedUsers = users.map((user) => {
//                   let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object
//                   if (transformedUser.pic) {
//                         transformedUser.pic = `${baseURL}${transformedUser.pic}`;
//                   }
//                   if (transformedUser.watch_time) {
//                         transformedUser.watch_time =
//                               convertSecondsToReadableTime(
//                                     transformedUser.watch_time
//                               );
//                   }
//                   return { user: transformedUser };
//             });

//             const paginationDetails = {
//                   current_page: parseInt(page),
//                   data: transformedUsers,
//                   first_page_url: `${baseURL}api/users?page=1`,
//                   from: (page - 1) * perPage + 1,
//                   last_page: totalPages,
//                   last_page_url: `${baseURL}api/users?page=${totalPages}`,
//                   links: [
//                         {
//                               url: null,
//                               label: "&laquo; Previous",
//                               active: false,
//                         },
//                         {
//                               url: `${baseURL}api/users?page=${page}`,
//                               label: page.toString(),
//                               active: true,
//                         },
//                         {
//                               url: null,
//                               label: "Next &raquo;",
//                               active: false,
//                         },
//                   ],
//                   next_page_url: null,
//                   path: `${baseURL}api/users`,
//                   per_page: perPage,
//                   prev_page_url: null,
//                   to: (page - 1) * perPage + transformedUsers.length,
//                   total: totalCount,
//             };
//             console.log(paginationDetails);

//             res.json({
//                   Users: paginationDetails,
//                   page: page.toString(),
//                   total_rows: totalCount,
//             });
//       } catch (error) {
//             console.error(error);
//             res.status(500).json({
//                   message: "Internal Server Error",
//                   status: false,
//             });
//       }
// });

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, search = "", Short = "" } = req.body;
  const perPage = 10; // You can adjust this according to your requirements

  // Build the query based on search and Short
  const query = {
    $and: [
      {
        $or: [{ first_name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { last_name: { $regex: search, $options: "i" } }],
      },
      { role: "student" }, // Condition added to fetch only students
    ],
  };

  // Sorting based on Short field
  let sortCriteria = {};
  if (Short === "Review") {
    sortCriteria = { review: -1 }; // Sort by review in descending order
  } else if (Short === "watch_time") {
    sortCriteria = { watch_time: -1 }; // Sort by watch_time in descending order
  } else if (Short === "Subscribe") {
    sortCriteria = { subscribe: -1 }; // Sort by subscribe in descending order
  } else {
    sortCriteria = { _id: -1 }; // Default sorting
  }

  try {
    const users = await User.find(query)
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    // Map each user to an array of promises
    const transformedUsersPromises = users.map(async (user) => {
      let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object
      if (transformedUser.pic) {
        const getSignedUrl_pic = await getSignedUrlS3(transformedUser.pic);
        transformedUser.pic = getSignedUrl_pic;
      }
      if (transformedUser.watch_time) {
        transformedUser.watch_time = convertSecondsToReadableTimeAdmin(transformedUser.watch_time);
      }
      return { user: transformedUser };
    });

    // Execute all promises concurrently
    const transformedUsers = await Promise.all(transformedUsersPromises);

    const paginationDetails = {
      current_page: parseInt(page),
      data: transformedUsers,
      first_page_url: `${baseURL}api/users?page=1`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${baseURL}api/users?page=${totalPages}`,
      links: [
        {
          url: null,
          label: "&laquo; Previous",
          active: false,
        },
        {
          url: `${baseURL}api/users?page=${page}`,
          label: page.toString(),
          active: true,
        },
        {
          url: null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      next_page_url: null,
      path: `${baseURL}api/users`,
      per_page: perPage,
      prev_page_url: null,
      to: (page - 1) * perPage + transformedUsers.length,
      total: totalCount,
    };

    res.json({
      Users: paginationDetails,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

// const getAllTeachers = asyncHandler(async (req, res) => {
//   const { page = 1, search = "", Short = "" } = req.body;
//   const perPage = 10; // You can adjust this according to your requirements

//   // Build the query based on search and Short
//   const query = {
//     $and: [
//       {
//         $or: [{ first_name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { last_name: { $regex: search, $options: "i" } }],
//       },
//       { role: "teacher" }, // Condition added to fetch only students
//     ],
//   };

//   // Sorting based on Short field
//   let sortCriteria = {};
//   if (Short === "Review") {
//     sortCriteria = { review: -1 }; // Sort by review in descending order
//   } else if (Short === "watch_time") {
//     sortCriteria = { watch_time: -1 }; // Sort by watch_time in descending order
//   } else if (Short === "Subscribe") {
//     sortCriteria = { subscribe: -1 }; // Sort by subscribe in descending order
//   } else {
//     sortCriteria = { _id: -1 }; // Default sorting
//   }

//   try {
//     const users = await User.find(query)
//       .sort(sortCriteria)
//       .skip((page - 1) * perPage)
//       .limit(perPage)
//       .populate({
//         path: "payment_id",
//       });

//     const totalCount = await User.countDocuments(query);
//     const totalPages = Math.ceil(totalCount / perPage);

//     // Map each user to an array of promises
//     const transformedUsersPromises = users.map(async (user) => {
//       let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object
//       if (transformedUser.pic) {
//         const getSignedUrl_pic = await getSignedUrlS3(transformedUser.pic);
//         transformedUser.pic = getSignedUrl_pic;
//       }
//       if (transformedUser.watch_time) {
//         transformedUser.watch_time = convertSecondsToReadableTimeAdmin(transformedUser.watch_time);
//       }
//       return { user: transformedUser };
//     });

//     // Execute all promises concurrently
//     const transformedUsers = await Promise.all(transformedUsersPromises);

//     const paginationDetails = {
//       current_page: parseInt(page),
//       data: transformedUsers,
//       first_page_url: `${baseURL}api/users?page=1`,
//       from: (page - 1) * perPage + 1,
//       last_page: totalPages,
//       last_page_url: `${baseURL}api/users?page=${totalPages}`,
//       links: [
//         {
//           url: null,
//           label: "&laquo; Previous",
//           active: false,
//         },
//         {
//           url: `${baseURL}api/users?page=${page}`,
//           label: page.toString(),
//           active: true,
//         },
//         {
//           url: null,
//           label: "Next &raquo;",
//           active: false,
//         },
//       ],
//       next_page_url: null,
//       path: `${baseURL}api/users`,
//       per_page: perPage,
//       prev_page_url: null,
//       to: (page - 1) * perPage + transformedUsers.length,
//       total: totalCount,
//     };

//     console.log(paginationDetails);

//     res.json({
//       Users: paginationDetails,
//       page: page.toString(),
//       total_rows: totalCount,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Internal Server Error",
//       status: false,
//     });
//   }
// });

const getAllTeachers = asyncHandler(async (req, res) => {
  const { page = 1, search = "", Short = "" } = req.body;
  const perPage = 10; // You can adjust this according to your requirements

  // Build the query based on search and Short
  const query = {
    $and: [
      {
        $or: [{ first_name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { last_name: { $regex: search, $options: "i" } }],
      },
      { role: "teacher" }, // Condition added to fetch only teachers
    ],
  };

  // Sorting based on Short field
  let sortCriteria = {};
  if (Short === "Review") {
    sortCriteria = { review: -1 }; // Sort by review in descending order
  } else if (Short === "watch_time") {
    sortCriteria = { watch_time: -1 }; // Sort by watch_time in descending order
  } else if (Short === "Subscribe") {
    sortCriteria = { subscribe: -1 }; // Sort by subscribe in descending order
  } else {
    sortCriteria = { _id: -1 }; // Default sorting
  }

  try {
    const users = await User.find(query)
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate({
        path: "payment_id",
      });

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    // Map each user to an array of promises
    const transformedUsersPromises = users.map(async (user) => {
      let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object
      if (transformedUser.pic) {
        const getSignedUrl_pic = await getSignedUrlS3(transformedUser.pic);
        transformedUser.pic = getSignedUrl_pic;
      }
      if (transformedUser.watch_time) {
        transformedUser.watch_time = convertSecondsToReadableTimeAdmin(transformedUser.watch_time);
      }

      // Determine the payment type dynamically based on payment_id
      if (transformedUser.payment_id) {
        let paymentType;
        let paymentAmount;

        if (transformedUser.payment_id.advance !== undefined) {
          paymentType = "advance";
          paymentAmount = transformedUser.payment_id.advance;
        } else if (transformedUser.payment_id.master !== undefined) {
          paymentType = "master";
          paymentAmount = transformedUser.payment_id.master;
        } else {
          // Handle case where neither advance nor master is defined
          paymentType = null;
          paymentAmount = null;
        }

        transformedUser.payment = {
          type: paymentType,
          amount: paymentAmount,
        };
        delete transformedUser.payment_id; // Remove payment_id from the user object
      } else {
        transformedUser.payment = {
          type: null,
          amount: null,
        };
      }

      return { user: transformedUser };
    });

    // Execute all promises concurrently
    const transformedUsers = await Promise.all(transformedUsersPromises);

    const paginationDetails = {
      current_page: parseInt(page),
      data: transformedUsers,
      first_page_url: `${baseURL}api/users?page=1`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${baseURL}api/users?page=${totalPages}`,
      links: [
        {
          url: null,
          label: "&laquo; Previous",
          active: false,
        },
        {
          url: `${baseURL}api/users?page=${page}`,
          label: page.toString(),
          active: true,
        },
        {
          url: null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      next_page_url: null,
      path: `${baseURL}api/users`,
      per_page: perPage,
      prev_page_url: null,
      to: (page - 1) * perPage + transformedUsers.length,
      total: totalCount,
    };

    console.log(paginationDetails);

    res.json({
      Users: paginationDetails,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getAllUsersWebsite = asyncHandler(async (req, res) => {
  const { page = 1, search = "" } = req.body;
  const perPage = 10; // You can adjust this according to your requirements

  // Build the query based on search
  let query = {};
  if (search) {
    query = {
      $or: [{ full_name: { $regex: search, $options: "i" } }, { username: { $regex: search, $options: "i" } }],
    };
  }

  try {
    if (req.user && req.user._id) {
      // Only exclude req.user._id if it's available
      query._id = { $ne: req.user._id };
    }

    const users = await User.find(query)
      .select("_id first_name last_name username pic")
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    // Map each user to an array of promises
    const transformedUsersPromises = users.map(async (user) => {
      let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object
      if (transformedUser.pic) {
        const getSignedUrl_pic = await getSignedUrlS3(transformedUser.pic);
        transformedUser.pic = getSignedUrl_pic;
      }
      if (transformedUser.watch_time) {
        transformedUser.watch_time = convertSecondsToReadableTime(transformedUser.watch_time);
      }
      return transformedUser;
    });

    // Execute all promises concurrently
    const transformedUsers = await Promise.all(transformedUsersPromises);

    res.json({
      data: transformedUsers,
      page: page.toString(),
      total_rows: totalCount,
      status: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const searchUsers = asyncHandler(async (req, res) => {
  const { page = 1, name = "" } = req.body;
  const perPage = 100; // Adjust according to your requirements
  try {
    let query = {
      $or: [{ full_name: { $regex: name, $options: "i" } }, { username: { $regex: name, $options: "i" } }],
    };

    // If name contains a space, search for the last name as well

    // Exclude the current user if req.user._id is available
    if (req.user && req.user._id) {
      query._id = { $ne: req.user._id };
    }

    const users = await User.find(query)
      .select("_id first_name last_name username")
      .skip((page - 1) * perPage)
      .limit(perPage);

    let transformedUsers = users.map((user) => ({
      _id: user._id,
      title: `${user.first_name} ${user.last_name}`,
      label: "User List",
    }));

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    res.json({
      data: transformedUsers,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const updateProfileDataByAdmin = asyncHandler(async (req, res) => {
  const { edit_mobile_name, userId } = req.body;

  try {
    // Update only the mobile number
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { mobile: edit_mobile_name } },
      { new: true } // Option to return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      _id: updatedUser._id,
      mobile: updatedUser.mobile,
      status: true,
    });
  } catch (error) {
    console.error("Error updating mobile number:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const getAllDashboardCount = asyncHandler(async (req, res) => {
  try {
    const category = await Category.countDocuments(); // Assuming there is only one document
    const user = await User.countDocuments();
    const video = await Video.countDocuments();
    const reels = await Reel.countDocuments();
    const postTimeline = await PostTimeline.countDocuments();
    const postJob = await PostJob.countDocuments();
    const adminnotifications = await AdminNotificationMessages.countDocuments({
      readstatus: false,
    }); // Counting only documents with readstatus false
    const transactionAmountSum = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }, // Summing the "amount" field
        },
      },
    ]);

    // Extracting the total sum of the "amount" field
    const transactionTotalAmount = transactionAmountSum.length > 0 ? transactionAmountSum[0].totalAmount : 0;

    res.status(200).json({
      category: category,
      user: user,
      video: video,
      reels: reels,
      PostTimeline: postTimeline,
      PostJob: postJob,
      adminnotifications: adminnotifications,
      transactionTotalAmount: transactionTotalAmount,
    });
  } catch (error) {
    console.error("Error getting dashboard counts:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const addReview = asyncHandler(async (req, res) => {
  const my_id = req.user._id;
  const { review_id, review_number, description, hire_list_id } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ _id: my_id });
    const user_reviewers = await User.findOne({ _id: review_id });

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found.",
      });
    }

    // Find the corresponding Hire entry based on hire_list_id
    const hireEntry = await Hire.findOne({ _id: hire_list_id });

    if (!hireEntry) {
      return res.status(400).json({
        status: false,
        message: "Hire entry not found.",
      });
    }

    // Find the corresponding HireStatus entry based on status_code "3"
    const hireStatus = await HireStatus.findOne({ status_code: "3" });

    if (!hireStatus) {
      return res.status(400).json({
        status: false,
        message: "Hire status not found for code 3.",
      });
    }

    // Update the work_status of the Hire entry to the found _id
    hireEntry.work_status = hireStatus._id;

    // Save the updated Hire entry
    await hireEntry.save();

    // If review_id is not provided, create a new review
    const review = await Review.create({
      review_id,
      review_number,
      description,
      my_id,
      hire_list_id,
    });

    // Fetch all reviews for the current user
    const userReviews = await Review.find({ review_id });

    // Calculate the average review
    const totalReviews = userReviews.length;
    const sumOfReviews = userReviews.reduce((acc, review) => acc + review.review_number, 0);
    const averageReview = sumOfReviews / totalReviews;

    // Round to one decimal place
    const roundedAverage = averageReview.toFixed(1);

    // Update the user's review_name field with the rounded average
    user_reviewers.review = roundedAverage;

    await User.updateOne({ _id: review_id }, { $set: { review: user_reviewers.review } });
    //await user_reviewers.save();

    type = "Review";
    message = `Completed Review.`;
    sender_id = my_id;
    receiver_id = review_id;
    createNotification(sender_id, receiver_id, message, type);

    res.status(200).json({
      status: true,
      message: "Review created/updated successfully.",
    });
  } catch (error) {
    console.error("Error creating/updating review:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

const getReview = asyncHandler(async (req, res) => {
  try {
    const user_id = req.params.id;
    const page = req.query.page || 1;
    const pageSize = 10;

    const notifications = await Review.find({
      review_id: user_id,
    })
      .sort({ _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (!notifications || notifications.length === 0) {
      return res.status(200).json({ status: false, notifications: [] });
    }

    const notificationList = await Promise.all(
      notifications.map(async (notification) => {
        const senderDetails = await User.findById(notification.my_id);

        const sender = {
          _id: senderDetails._id,
          first_name: senderDetails.first_name,
          last_name: senderDetails.last_name,
          pic: `${senderDetails.pic}`,
        };

        const notificationWithSender = {
          _id: notification._id,
          sender,
          message: notification.message,
          review_number: notification.review_number,
          description: notification.description,
          type: notification.type,
          time: calculateTimeDifference(notification.datetime),
          date: notification.datetime.split(" ")[0],
        };

        return notificationWithSender;
      })
    );

    res.status(200).json({
      status: true,
      reviews: notificationList,
    });
  } catch (error) {
    console.error("Error getting notification list:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const Watch_time_update = asyncHandler(async (req, res) => {
  try {
    const { time } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        message: "User ID not provided in headers",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Incoming time ko seconds mein convert kare
    const incomingTimeInSeconds = calculateTimeInSecondsFromInput(time);

    // Update watch_time field in the user model
    user.watch_time += incomingTimeInSeconds;

    // Save the updated user
    await user.save();

    return res.json({
      message: "Watch time updated successfully",
      updatedUser: user,
    });
  } catch (error) {
    console.error("Watch_time_update API error:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

const websiteNotificationToken = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;
    const user_id = req.user._id;

    // Check if user_id and token are provided
    if (!user_id || !token) {
      return res.status(400).json({ error: "Both user_id and token are required" });
    }

    // Check if the entry with the given user_id exists
    let existingNotification = await WebNotification.findOne({
      user_id,
    });

    if (existingNotification) {
      // Update the existing entry
      existingNotification.token = token;
      await existingNotification.save();

      return res.status(200).json(existingNotification);
    }

    // Create a new entry
    const newNotification = await WebNotification.create({
      user_id,
      token,
    });

    return res.status(201).json(newNotification);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const NotificationList = asyncHandler(async (req, res) => {
  try {
    const user_id = req.user._id;
    const page = req.query.page || 1;
    const pageSize = 500;

    const notifications = await NotificationMessages.find({
      receiver_id: user_id,
    })
      .sort({ _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (!notifications || notifications.length === 0) {
      return res.status(200).json({ status: false, notifications: [] });
    }

    await Promise.all(
      notifications.map(async (notification) => {
        // Update readstatus to true for the current notification
        await NotificationMessages.findByIdAndUpdate(notification._id, { readstatus: true });
      })
    );

    const notificationList = await Promise.all(
      notifications.map(async (notification) => {
        const senderDetails = await User.findById(notification.sender_id);

        const sender = {
          _id: senderDetails._id,
          first_name: senderDetails.first_name,
          last_name: senderDetails.last_name,
          pic: `${senderDetails.pic}`,
        };

        const notificationWithSender = {
          _id: notification._id,
          sender,
          message: notification.message,
          metadata: notification.metadata,
          type: notification.type,
          time: NotificationTimer(notification.datetime),
          date: notification.datetime.split(" ")[0],
        };

        return notificationWithSender;
      })
    );

    res.status(200).json({
      status: true,
      notifications: notificationList,
    });
  } catch (error) {
    console.error("Error getting notification list:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getNotificationId = asyncHandler(async (req, res) => {
  try {
    const sender_id = req.body.sender_id;
    const type = req.body.type; // Assuming user_id is provided as a query parameter
    const receiver_id = req.user._id;

    const notifications = await NotificationMessages.findOne(
      {
        sender_id: sender_id,
        receiver_id: receiver_id,
        type: type, // Filtering by type 'Friend_Request'
      },
      "_id"
    ); // Only selecting the _id field

    res.status(200).json({
      status: true,
      notificetion_id: notifications,
    });
  } catch (error) {
    console.error("Error getting notifications:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const UserAdminStatus = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  try {
    // Find the video by its _id
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check if deleted_at field is null or has a value
    if (user.deleted_at === null) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            deleted_at: new Date(),
          },
        },
        { new: true }
      );
    } else {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            deleted_at: null,
          },
        },
        { new: true }
      );
    }
    return res.status(200).json({
      message: "User soft delete status toggled successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

const getUnreadCount = async (req, res) => {
  try {
    const user_id = req.user._id;
    const unreadNotifications = await NotificationMessages.find({
      receiver_id: user_id,
      readstatus: false,
    });

    let unreadCount = unreadNotifications.length;
    if (unreadCount > 10) {
      unreadCount = 10;
    } else if (unreadCount == 0) {
      unreadCount = "";
    }

    return res.status(200).json({ status: true, Count: unreadCount });
  } catch (error) {
    console.error("Error getting unread count:", error.message);
    throw new Error("Error getting unread count");
  }
};

const NotificationTimer = (databaseTime) => {
  try {
    if (!databaseTime) {
      return "Invalid time";
    }

    // Calculate current time in IST timezone
    const currentTime = moment().tz("Asia/Kolkata");

    // Parse the time strings using moment
    const databaseMoment = moment.tz(databaseTime, "DD-MM-YYYY HH:mm:ss", "Asia/Kolkata");

    // Calculate the difference between the two times
    const differenceInMilliseconds = currentTime.diff(databaseMoment);

    // Convert the difference to seconds, minutes, hours, and days
    const duration = moment.duration(differenceInMilliseconds);
    const seconds = duration.seconds();
    const minutes = duration.minutes();
    const hours = duration.hours();
    const days = duration.days();

    // Construct the time difference string
    let timeDifference = "";
    if (days > 0) {
      timeDifference += `${days} days `;
    } else if (hours > 0) {
      timeDifference += `${hours} hours `;
    } else if (minutes > 0) {
      timeDifference += `${minutes} minutes `;
    } else if (seconds > 0) {
      timeDifference += `${seconds} seconds`;
    }

    // Return the time difference string
    return timeDifference.trim() === "" ? "Just now" : timeDifference.trim();
  } catch (error) {
    console.error("Error calculating time difference:", error.message);
    return "Invalid time format";
  }
};

const calculateTimeDifference = (datetime) => {
  try {
    // Check if datetime is undefined or null
    if (!datetime) {
      return "Invalid date";
    }

    const currentTime = moment().tz("Asia/Kolkata"); // Get current time in Asia/Kolkata timezone
    const notificationTime = moment(datetime, "DD-MM-YYYY HH:mm:ss").tz("Asia/Kolkata");

    return notificationTime.from(currentTime); // Use from() instead of fromNow()
  } catch (error) {
    console.error("Error calculating time difference:", error.message);
    return "Invalid date format";
  }
};

function convertSecondsToReadableTimeAdmin(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds * 1000) % 1000);

  // Format the time string
  const timeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(milliseconds).padStart(2, "3")}`;
  return timeString;
}

function convertSecondsToReadableTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} hr`;
  } else if (hours > 0) {
    return `${hours} hr`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return 0;
  }
}

function calculateTimeInSecondsFromInput(time) {
  // Convert incoming time to seconds
  const timeLower = time.toLowerCase();
  if (timeLower.includes("sec")) {
    // Extract seconds
    return parseInt(timeLower);
  } else if (timeLower.includes("min")) {
    // Extract minutes and convert to seconds
    return parseInt(timeLower) * 60;
  } else if (timeLower.includes("hr")) {
    // Extract hours and convert to seconds
    return parseInt(timeLower) * 60 * 60;
  } else if (timeLower.includes("day")) {
    // Extract days and convert to seconds
    return parseInt(timeLower) * 24 * 60 * 60;
  } else {
    return 0;
  }
}

function generateOTP() {
  const min = 1000; // Minimum 4-digit number
  const max = 9999; // Maximum 4-digit number

  // Generate a random number between min and max (inclusive)
  const otp = Math.floor(Math.random() * (max - min + 1)) + min;

  return otp.toString(); // Convert the number to a string
}

function TextLocalApi(type, name, mobile, otp) {
  let message;

  if (type === "Signup") {
    message = `Hello ${name}, welcome to Tobuu! Your OTP for account verification is: ${otp}. Enter this code to complete the process`;
  } else if (type === "Resend") {
    message = `Hello ${name}, your Tobuu account OTP is ${otp}. If you requested this resend, please use the following code to verify your account. If not, please ignore this message`;
  } else if (type === "Forget_Password") {
    message = `Hello ${name}, your Tobuu account verification code for password change is ${otp}. If you didn't request this, please ignore this message. If yes, use the code to change your password securely.`;
  }

  const apiKey = process.env.TEXTLOCAL_API;
  const sender = process.env.TEXTLOCAL_HEADER;
  const number = mobile;

  const url = `http://api.textlocal.in/send/?apiKey=${apiKey}&sender=${sender}&numbers=${number}&message=${encodeURIComponent(message)}`;

  const sendSms = async () => {
    try {
      const response = await axios.post(url);
    } catch (error) {
      console.error("error", error.message);
    }
  };

  sendSms();
}
const getProfilePicUploadUrlS3 = asyncHandler(async (req, res) => {
  const user_id = req.user._id;
  const user = await User.findById(user_id);
  const username = user.username;
  const profilepicget_url = await PutObjectProfilePic(username);

  return res.status(200).json({
    profilepicget_url,
    status: true,
  });
});

// const updateUserWatchTime = async (req, res) => {
//   const userId = req.user._id;
//   const newTime = req.body.time; // Assuming the new time is passed in the request body

//   try {
//     // Find the user by user_id to get the current watch_time
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         message: "User not found",
//         status: false,
//       });
//     }

//     // Get the current watch_time from the user object
//     let currentWatchTime = user.watch_time || 0;

//     // Convert the current watch_time and new time to numbers and add them
//     currentWatchTime = Number(currentWatchTime) + Number(newTime);

//     // Update the watch_time field in the User table
//     await User.findByIdAndUpdate(userId, {
//       watch_time: currentWatchTime,
//     });

//     return res.json({
//       message: "Watch time updated successfully",
//       status: true,
//       watch_time: currentWatchTime,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       status: false,
//     });
//   }
// };

const ManullyListUpdate = asyncHandler(async (req, res) => {
  try {
    // Sabhi users ko 0 subscribe karne ke liye 'subscribe' field ko update karo
    const result = await User.updateMany({}, { subscribe: 0 });

    // Success response
    res.json({ message: "Subscriptions updated successfully" });
  } catch (error) {
    // Error handling
    console.error("Error updating subscriptions:", error);
    res.status(500).json({ error: "Error updating subscriptions" });
  }
});

const UpdateMobileAdmin = asyncHandler(async (req, res) => {
  const { UserId, mobile } = req.body;
  const _id = UserId;
  // Find the user by mobile number
  const user = await User.findOne({ _id });
  const usermobile = await User.findOne({ mobile });

  if (usermobile) {
    res.status(200).json({
      message: "Mobile number already exit.",
      status: true,
    });
    return;
  }
  // Update the user's otp field with the new OTP
  const result = await User.updateOne({ _id: user._id }, { $set: { mobile: mobile } });

  // Send the new OTP to the user (you can implement this logic)

  res.json({
    message: "Mobile number successfully.",
    status: true,
  });
});

const updateAllUsersFullName = asyncHandler(async (req, res) => {
  try {
    // Find all users
    const users = await User.find({});

    // Update full name for each user
    for (const user of users) {
      const fullName = `${user.first_name} ${user.last_name}`;
      user.full_name = fullName;
      await user.save({ fields: ["full_name"] }); // Only save full_name field
      console.log(`Updated full name for user ${user._id}: ${fullName}`);
    }

    console.log("All users updated successfully");
  } catch (error) {
    console.error("Error updating users:", error);
  }
});

const Put_Profile_Pic_munally = asyncHandler(async (req, res) => {
  const profilepicget_url = await PutObjectProfilePic("000000");
  return res.status(200).json({
    profilepicget_url,
    status: true,
  });
});

const Delete_DeleteSignedUrlS3 = asyncHandler(async (req, res) => {
  const profilepicget_url = await DeleteSignedUrlS3("Profile/000000");
  return res.status(200).json({
    profilepicget_url,
    status: true,
  });
});

const getAllCourse = asyncHandler(async (req, res) => {
  const { page = 1, search = "", sort = "" } = req.body;
  const perPage = 10; // You can adjust this according to your requirements

  // Build the query based on search
  const query = {
    $or: [{ title: { $regex: search, $options: "i" } }],
  };

  // Sorting based on sort field
  let sortCriteria = {};
  if (sort === "startTime") {
    sortCriteria = { startTime: -1 }; // Sort by startTime in descending order
  } else if (sort === "endTime") {
    sortCriteria = { endTime: -1 }; // Sort by endTime in descending order
  } else {
    sortCriteria = { _id: -1 }; // Default sorting
  }

  try {
    const courses = await Course.find(query)
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("category_id")
      .populate("teacher_id");

    const totalCount = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    const transformedCoursesPromises = courses.map(async (course) => {
      let transformedCourse = { ...course.toObject() }; // Convert Mongoose document to plain JavaScript object
      console.log(courses);
      if (transformedCourse.startTime) {
        transformedCourse.startTime = moment(transformedCourse.startTime).format("DD/MM/YYYY");
      }
      if (transformedCourse.endTime) {
        transformedCourse.endTime = moment(transformedCourse.endTime).format("DD/MM/YYYY");
      }

      // Fetch subcategory name
      const category = await Category.findById(transformedCourse.category_id);
      const subCategory = category.subcategories.id(transformedCourse.sub_category_id);

      transformedCourse.category_name = category.category_name;
      transformedCourse.subcategory_name = subCategory.subcategory_name;

      // Remove the category and subcategory objects from the response
      delete transformedCourse.category_id.subcategories;
      delete transformedCourse.sub_category_id;

      return {
        _id: transformedCourse._id,
        title: transformedCourse.title,
        category_name: transformedCourse.category_name,
        subcategory_name: transformedCourse.subcategory_name,
        type: transformedCourse.type,
        startTime: transformedCourse.startTime,
        endTime: transformedCourse.endTime,
        teacher: transformedCourse.teacher_id,
        createdAt: transformedCourse.createdAt,
        updatedAt: transformedCourse.updatedAt,
      };
    });

    // Execute all promises concurrently
    const transformedCourses = await Promise.all(transformedCoursesPromises);

    const paginationDetails = {
      current_page: parseInt(page),
      data: transformedCourses,
      first_page_url: `${baseURL}api/courses?page=1`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${baseURL}api/courses?page=${totalPages}`,
      links: [
        {
          url: null,
          label: "&laquo; Previous",
          active: false,
        },
        {
          url: `${baseURL}api/courses?page=${page}`,
          label: page.toString(),
          active: true,
        },
        {
          url: null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      next_page_url: null,
      path: `${baseURL}api/courses`,
      per_page: perPage,
      prev_page_url: null,
      to: (page - 1) * perPage + transformedCourses.length,
      total: totalCount,
    };

    res.json({
      Courses: paginationDetails,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getCoursesByTeacherId = asyncHandler(async (req, res) => {
  const { teacher_id } = req.params; // Teacher ID from URL parameters
  console.log(req.params);
  const { page = 1, search = "", sort = "" } = req.body;
  const perPage = 10; // You can adjust this according to your requirements

  // Build the query based on search and teacher_id
  const query = {
    $and: [{ teacher_id }, { $or: [{ title: { $regex: search, $options: "i" } }] }],
  };

  // Sorting based on sort field
  let sortCriteria = {};
  if (sort === "startTime") {
    sortCriteria = { startTime: -1 }; // Sort by startTime in descending order
  } else if (sort === "endTime") {
    sortCriteria = { endTime: -1 }; // Sort by endTime in descending order
  } else {
    sortCriteria = { _id: -1 }; // Default sorting
  }

  try {
    const courses = await Course.find(query)
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("category_id")
      .populate("teacher_id");

    const totalCount = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    const transformedCoursesPromises = courses.map(async (course) => {
      let transformedCourse = { ...course.toObject() }; // Convert Mongoose document to plain JavaScript object

      if (transformedCourse.startTime) {
        transformedCourse.startTime = moment(transformedCourse.startTime).format("DD/MM/YYYY");
      }
      if (transformedCourse.endTime) {
        transformedCourse.endTime = moment(transformedCourse.endTime).format("DD/MM/YYYY");
      }

      // Fetch subcategory name
      const category = await Category.findById(transformedCourse.category_id);
      const subCategory = category.subcategories.id(transformedCourse.sub_category_id);

      transformedCourse.category_name = category.category_name;
      transformedCourse.subcategory_name = subCategory.subcategory_name;

      // Remove the category and subcategory objects from the response
      delete transformedCourse.category_id.subcategories;
      delete transformedCourse.sub_category_id;

      return {
        _id: transformedCourse._id,
        title: transformedCourse.title,
        category_name: transformedCourse.category_name,
        subcategory_name: transformedCourse.subcategory_name,
        type: transformedCourse.type,
        startTime: transformedCourse.startTime,
        endTime: transformedCourse.endTime,
        teacher: transformedCourse.teacher_id,
        createdAt: transformedCourse.createdAt,
        updatedAt: transformedCourse.updatedAt,
      };
    });

    // Execute all promises concurrently
    const transformedCourses = await Promise.all(transformedCoursesPromises);

    const paginationDetails = {
      current_page: parseInt(page),
      data: transformedCourses,
      first_page_url: `${baseURL}api/courses/teacher/${teacher_id}?page=1`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${baseURL}api/courses/teacher/${teacher_id}?page=${totalPages}`,
      links: [
        {
          url: null,
          label: "&laquo; Previous",
          active: false,
        },
        {
          url: `${baseURL}api/courses/teacher/${teacher_id}?page=${page}`,
          label: page.toString(),
          active: true,
        },
        {
          url: null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      next_page_url: null,
      path: `${baseURL}api/courses/teacher/${teacher_id}`,
      per_page: perPage,
      prev_page_url: null,
      to: (page - 1) * perPage + transformedCourses.length,
      total: totalCount,
    };

    console.log(paginationDetails);

    res.json({
      Courses: paginationDetails,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const addMasterPayment = asyncHandler(async (req, res, next) => {
  let { master } = req.body;

  // Convert string values to numbers if they exist
  master = master ? parseFloat(master) : undefined;

  if (isNaN(master) || master === 0) {
    return next(new ErrorHandler("Please enter a valid master payment amount.", 400));
  }

  const masterPayment = new TeacherPayment({ master });
  await masterPayment.save();

  res.status(200).json({
    message: "Master payment added successfully",
    masterPayment,
    status: true,
  });
});

const updateMasterPayment = asyncHandler(async (req, res, next) => {
  let { master, id } = req.body;
  console.log(req.body);
  // Convert string values to numbers if they exist
  master = master ? parseFloat(master) : undefined;

  if (isNaN(master) || master === 0) {
    return next(new ErrorHandler("Please enter a valid master payment amount.", 400));
  }

  const masterPayment = await TeacherPayment.findById(id);

  if (!masterPayment) {
    return next(new ErrorHandler("Master payment not found.", 404));
  }

  masterPayment.master = master;

  await masterPayment.save();

  res.status(200).json({
    message: "Master payment updated successfully",
    masterPayment,
    status: true,
  });
});

const addAdvancePayment = asyncHandler(async (req, res, next) => {
  let { advance } = req.body;
  // Convert string values to numbers if they exist
  advance = advance ? parseFloat(advance) : undefined;

  if (isNaN(advance) || advance === 0) {
    return next(new ErrorHandler("Please enter a valid advance payment amount.", 400));
  }

  const advancePayment = new TeacherPayment({ advance });
  await advancePayment.save();

  res.status(200).json({
    message: "Advance payment added successfully",
    advancePayment,
    status: true,
  });
});

const updateAdvancePayment = asyncHandler(async (req, res, next) => {
  let { advance, id } = req.body;

  // Convert string values to numbers if they exist
  advance = advance ? parseFloat(advance) : undefined;

  if (isNaN(advance) || advance === 0) {
    return next(new ErrorHandler("Please enter a valid advance payment amount.", 400));
  }

  const advancePayment = await TeacherPayment.findById(id);

  if (!advancePayment) {
    return next(new ErrorHandler("Advance payment not found.", 404));
  }

  advancePayment.advance = advance;

  await advancePayment.save();

  res.status(200).json({
    message: "Advance payment updated successfully",
    advancePayment,
    status: true,
  });
});

const getMasterAndAdvancePayments = asyncHandler(async (req, res) => {
  const payments = await TeacherPayment.find({});

  // Transform payments into the desired format
  const formattedPayments = [];

  payments.forEach((payment) => {
    // Add advance payment if exists
    if (payment.advance) {
      formattedPayments.push({
        _id: payment._id,
        Payment: payment.advance,
        Type: "advance",
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      });
    }

    // Add master payment if exists
    if (payment.master) {
      formattedPayments.push({
        _id: payment._id,
        Payment: payment.master,
        Type: "master",
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      });
    }
  });

  res.status(200).json({
    message: "Payments retrieved successfully",
    payments: formattedPayments,
  });
});

const updateUserPayment = async (req, res, next) => {
  const { userId, payment_id } = req.body;

  if (!userId || !payment_id) {
    return next(new ErrorHandler("Please provide userId and payment_id.", 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  // Assuming user has only one payment object to be updated
  user.payment_id = payment_id;

  user.updatedAt = Date.now();

  await user.save();

  res.status(200).json({
    _id: user._id,
    payment_id: user.payment_id,
    updatedAt: user.updatedAt,
  });
};

const getTeacherAndCourseByTeacher_IdAndType = async (req, res, next) => {
  const { teacher_id, type } = req.body;

  try {
    // Find the teacher by ID and populate payment information
    const teacher = await User.findById(teacher_id).populate({
      path: "payment_id",
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Find courses for the teacher with the specified type
    const courses = await Course.find({
      teacher_id: teacher_id,
      type: type,
    });

    // Check course availability
    const coursesWithAvailability = courses.map((course) => {
      let courseAvailable;
      if (course.type === "group_course") {
        courseAvailable = course.userIds.length < 3 ? "available" : "full";
      } else if (course.type === "single_course") {
        courseAvailable = course.userIds.length < 1 ? "available" : "full";
      }
      return {
        ...course.toObject(),
        courseAvailable,
      };
    });

    // Calculate average rating for the teacher
    const ratings = await Rating.find({ teacher_id: teacher_id });
    const averageRating = ratings.length ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length : 0;

    res.status(200).json({
      teacher: {
        ...teacher.toObject(),
        averageRating,
      },
      courses: coursesWithAvailability,
    });
  } catch (error) {
    console.error("Error fetching teacher and courses:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
};

const addFavoriteTeacher = asyncHandler(async (req, res) => {
  const { teacher_ids } = req.body;
  const user_id = req.headers.userID;

  // Check if teacher_ids is a string and convert it to an array
  let teacherIdsArray = [];
  if (typeof teacher_ids === "string") {
    teacherIdsArray = [teacher_ids];
  } else if (Array.isArray(teacher_ids)) {
    teacherIdsArray = teacher_ids;
  } else {
    return res.status(400).json({ message: "Invalid input" });
  }

  if (!user_id || !teacherIdsArray.length) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    let favorite = await Favorite.findOne({ user_id });

    if (favorite) {
      // Ensure favorite.teacher_ids is an array
      if (!Array.isArray(favorite.teacher_ids)) {
        favorite.teacher_ids = [];
      }

      // Avoid duplicates
      teacherIdsArray.forEach((id) => {
        if (!favorite.teacher_ids.includes(id)) {
          favorite.teacher_ids.push(id);
        }
      });

      await favorite.save();
    } else {
      favorite = new Favorite({
        user_id,
        teacher_ids: teacherIdsArray,
      });
      await favorite.save();
    }

    res.status(201).json({
      message: "Favorite teachers updated successfully",
      favorite,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const removeFavoriteTeacher = asyncHandler(async (req, res) => {
  const { teacher_ids } = req.body;
  const user_id = req.headers.userID;

  // Check if teacher_ids is a string and convert it to an array
  let teacherIdsArray = [];
  if (typeof teacher_ids === "string") {
    teacherIdsArray = [teacher_ids];
  } else if (Array.isArray(teacher_ids)) {
    teacherIdsArray = teacher_ids;
  } else {
    return res.status(400).json({ message: "Invalid input" });
  }

  if (!user_id || !teacherIdsArray.length) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    let favorite = await Favorite.findOne({ user_id });

    if (favorite) {
      // Ensure favorite.teacher_ids is an array
      if (Array.isArray(favorite.teacher_ids)) {
        console.log("Before removal:", favorite.teacher_ids);
        // Remove the specified teacher_ids
        favorite.teacher_ids = favorite.teacher_ids.filter((id) => !teacherIdsArray.includes(id.toString()));
        console.log("After removal:", favorite.teacher_ids);
        await favorite.save();

        res.status(200).json({
          message: "Favorite teachers removed successfully",
          favorite,
        });
      } else {
        res.status(400).json({
          message: "No favorite teachers found",
        });
      }
    } else {
      res.status(400).json({
        message: "Favorite record not found",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getFavoriteTeachers = asyncHandler(async (req, res) => {
  const user_id = req.headers.userID;

  if (!user_id) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    const favorite = await Favorite.findOne({ user_id }).populate({
      path: "teacher_ids",
      populate: {
        path: "payment_id",
        model: "TeacherPayment",
      },
    });

    if (!favorite) {
      return res.status(404).json({
        message: "No favorite teachers found for this user.",
      });
    }

    // Calculate average rating for each favorite teacher
    const favoriteTeachersWithRating = await Promise.all(
      favorite.teacher_ids.map(async (teacher) => {
        const ratings = await Rating.find({
          teacher_id: teacher._id,
        });
        const averageRating = ratings.length ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length : 0;

        return {
          ...teacher.toObject(),
          averageRating,
        };
      })
    );

    res.status(200).json({
      favorite_teachers: favoriteTeachersWithRating,
    });
  } catch (error) {
    console.error("Error fetching favorite teachers:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// const getTeachersBySubcategory = asyncHandler(async (req, res) => {
//   const { subcategory_id } = req.body;
//   const user_id = req.headers.userID;

//   if (!subcategory_id || !user_id) {
//     return res.status(400).json({ message: "Invalid input" });
//   }

//   try {
//     // Find courses with the given subcategory_id
//     const courses = await Course.find({ sub_category_id: subcategory_id }).populate("teacher_id");

//     if (!courses.length) {
//       return res.status(404).json({ message: "No courses found for the given subcategory ID" });
//     }

//     // Extract unique teacher IDs
//     const teacherIds = [...new Set(courses.map((course) => course.teacher_id._id.toString()))];

//     // Find teacher details for these IDs and populate payment_id
//     const teachers = await User.find({ _id: { $in: teacherIds } }).populate("payment_id");

//     // Fetch the user's favorite teachers
//     const favorite = await Favorite.findOne({ user_id });

//     const favoriteTeacherIds = favorite ? favorite.teacher_ids.map((id) => id.toString()) : [];

//     // Add favorite status to each teacher
//     const teachersWithFavoriteStatus = teachers.map((teacher) => ({
//       ...teacher.toObject(),
//       favorite: favoriteTeacherIds.includes(teacher._id.toString()),
//     }));

//     res.status(200).json({ teachers: teachersWithFavoriteStatus });
//   } catch (error) {
//     console.error("Error fetching teachers:", error.message);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

const getTeachersBySubcategory = asyncHandler(async (req, res) => {
  const { subcategory_id } = req.body;
  const user_id = req.headers.userID;
  const { search } = req.query; // Assuming search query parameter for teacher name search

  if (!subcategory_id || !user_id) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    // Find courses with the given subcategory_id
    const courses = await Course.find({
      sub_category_id: subcategory_id,
    }).populate("teacher_id");

    if (!courses.length) {
      return res.status(404).json({
        message: "No courses found for the given subcategory ID",
      });
    }

    // Extract unique teacher IDs
    const teacherIds = [...new Set(courses.map((course) => course.teacher_id._id.toString()))];

    // Find teacher details for these IDs and populate payment_id
    let teachers = await User.find({
      _id: { $in: teacherIds },
    }).populate("payment_id");

    // Filter teachers by search query (teacher name)
    if (search) {
      const searchRegex = new RegExp(search, "i"); // Case-insensitive search regex
      teachers = teachers.filter((teacher) => searchRegex.test(teacher.full_name));
    }

    // Fetch the user's favorite teachers
    const favorite = await Favorite.findOne({ user_id });

    const favoriteTeacherIds = favorite ? favorite.teacher_ids.map((id) => id.toString()) : [];

    // Add favorite status and average rating to each teacher
    const teachersWithDetails = await Promise.all(
      teachers.map(async (teacher) => {
        const ratings = await Rating.find({
          teacher_id: teacher._id,
        });
        const averageRating = ratings.length ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length : 0;

        return {
          ...teacher.toObject(),
          favorite: favoriteTeacherIds.includes(teacher._id.toString()),
          averageRating,
        };
      })
    );

    res.status(200).json({ teachers: teachersWithDetails });
  } catch (error) {
    console.error("Error fetching teachers:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getCoursesByUserId = asyncHandler(async (req, res) => {
  const user_id = req.headers.userID;
  const sub_category_id = req.query.sub_category_id;

  if (!user_id) {
    return res.status(400).json({ message: "Invalid input" });
  }

  let query = { user_id };

  if (sub_category_id) {
    query["sub_category_id"] = sub_category_id;
  }

  try {
    const transactions = await Transaction.find(query)
      .populate({
        path: "course_id",
        model: "Course",
        populate: [
          {
            path: "teacher_id",
            model: "User",
            select: "full_name profile_pic",
          },
        ],
      })
      .exec();

    if (!transactions.length) {
      return res.status(404).json({
        message: "No courses found for the given user ID and sub-category ID",
      });
    }

    const coursesWithTeacherDetails = await Promise.all(
      transactions.map(async (transaction) => {
        const course = transaction.course_id;

        if (course && course.teacher_id) {
          const teacher = course.teacher_id;

          // Fetch the teacher's ratings
          const ratings = await Rating.find({ teacher_id: teacher._id });

          // Calculate the average rating
          const averageRating = ratings.length ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length : 0;

          // Check if the user has rated this teacher
          const userRating = await Rating.findOne({
            teacher_id: teacher._id,
            user_id,
          });

          return {
            ...course.toObject(),
            teacher: {
              ...teacher.toObject(),
              averageRating,
              userHasRated: !!userRating,
              userRating: userRating ? userRating.rating : null,
            },
          };
        }

        return course;
      })
    );

    res.status(200).json({ courses: coursesWithTeacherDetails });
  } catch (error) {
    console.error("Error fetching courses:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const updateStudentProfileData = asyncHandler(async (req, res) => {
  req.uploadPath = "uploads/profiles";
  upload.single("profile_pic")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { first_name, last_name } = req.body;
    const userId = req.headers.userID; // Assuming you have user authentication middleware

    // Get the profile picture path if uploaded
    const profile_pic = req.file ? `${req.uploadPath}/${req.file.filename}` : null;

    try {
      // Find the current user to get the old profile picture path
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Build the update object
      let updateFields = {
        datetime: moment().tz("Asia/Kolkata").format("YYYY-MMM-DD hh:mm:ss A"),
      };

      // Update first_name and last_name if provided
      if (first_name) {
        updateFields.first_name = first_name;
      }

      if (last_name) {
        updateFields.last_name = last_name;
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

      // Update the user's profile fields
      const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        _id: updatedUser._id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        profile_pic: updatedUser.profile_pic,
        status: true,
      });
    } catch (error) {
      console.error("Error updating user profile:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
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

const getStudentsPayment = asyncHandler(async (req, res) => {
  const teacherId = req.headers.userID; // Assuming you have user authentication middleware

  try {
    // Find all transactions for the given teacher
    const transactions = await Transaction.find({
      teacher_id: teacherId,
    });

    // Extract student IDs from the transactions
    const studentIds = transactions.map((txn) => txn.user_id);

    // Find student information for each transaction
    const students = await User.find({ _id: { $in: studentIds } }, "profile_pic full_name");

    // Find the teacher to get the payment_id
    const teacher = await User.findById(teacherId, "payment_id");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Prepare the response data
    const responseData = transactions.map((txn) => {
      const student = students.find((stu) => stu._id.equals(txn.user_id));

      return {
        student_id: txn.user_id,
        profile_pic: student.profile_pic,
        full_name: student.full_name,
        transaction_datetime: txn.datetime,
        amount: txn.amount,
      };
    });

    res.status(200).json({
      message: "Students fetched successfully",
      students: responseData,
    });
  } catch (error) {
    console.error("Error fetching students for teacher:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getTotalAmount = asyncHandler(async (req, res) => {
  const teacherId = req.headers.userID; // Assuming you have user authentication middleware

  try {
    // Find the teacher to get the full_name and profile_pic
    const teacher = await User.findById(teacherId, "full_name profile_pic");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Find all transactions for the given teacher
    const transactions = await Transaction.find({
      teacher_id: teacherId,
    });

    // Calculate the total amount
    const totalAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);

    // Group transactions by month
    const groupedTransactions = groupTransactionsByMonth(transactions);

    // Calculate total and current month amounts
    const currentDate = new Date();
    const currentMonthKey = moment(currentDate).format("YYYY-MM");
    const currentMonthAmount = groupedTransactions[currentMonthKey] ? groupedTransactions[currentMonthKey].reduce((sum, txn) => sum + txn.amount, 0) : 0;

    const monthlyAmounts = Object.keys(groupedTransactions).map((monthKey) => {
      const monthName = moment(monthKey, "YYYY-MM").format("MMM");
      return {
        month: `${monthName} ${moment(monthKey, "YYYY-MM").format("YYYY")}`,
        amount: groupedTransactions[monthKey].reduce((sum, txn) => sum + txn.amount, 0),
      };
    });

    res.status(200).json({
      message: "Total amounts fetched successfully",
      totalAmount,
      currentMonthAmount,
      monthlyAmounts,
      teacher: {
        full_name: teacher.full_name,
        profile_pic: teacher.profile_pic,
      },
    });
  } catch (error) {
    console.error("Error fetching total amounts for teacher:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

function groupTransactionsByMonth(transactions) {
  const groupedTransactions = {};

  transactions.forEach((txn) => {
    // Parse datetime using moment to convert it into a Date object
    const txnDate = moment(txn.datetime, "DD-MM-YYYY").toDate();

    // Format the date to YYYY-MM to use it as the key for grouping
    const monthKey = moment(txnDate).format("YYYY-MM");

    if (!groupedTransactions[monthKey]) {
      groupedTransactions[monthKey] = [];
    }
    groupedTransactions[monthKey].push(txn);
  });

  return groupedTransactions;
}

module.exports = {
  getUsers,
  registerUser,
  authUser,
  verifyOtp,
  resendOTP,
  updateProfileData,
  forgetPassword,
  ChangePassword,
  profilePicUpload,
  logoutUser,
  bank_Detail_create,
  getAllUsers,
  getAllDashboardCount,
  addReview,
  Watch_time_update,
  getUserView,
  getBankDetails,
  getBankDetailsAdmin,
  websiteNotificationToken,
  NotificationList,
  ForgetresendOTP,
  getProfilePicUploadUrlS3,
  profilePicKey,
  getReview,
  getUnreadCount,
  updateProfileDataByAdmin,
  getNotificationId,
  searchUsers,
  getAllUsersWebsite,
  // updateUserWatchTime,
  UserAdminStatus,
  ManullyListUpdate,
  UpdateMobileAdmin,
  updateAllUsersFullName,
  Put_Profile_Pic_munally,
  Delete_DeleteSignedUrlS3,
  getAllTeachers,
  getAllCourse,
  getCoursesByTeacherId,
  getMasterAndAdvancePayments,
  addAdvancePayment,
  addMasterPayment,
  updateMasterPayment,
  updateAdvancePayment,
  updateUserPayment,
  getTeacherAndCourseByTeacher_IdAndType,
  addFavoriteTeacher,
  removeFavoriteTeacher,
  getFavoriteTeachers,
  getTeachersBySubcategory,
  getCoursesByUserId,
  updateStudentProfileData,
  getStudentsPayment,
  getTotalAmount,
};
