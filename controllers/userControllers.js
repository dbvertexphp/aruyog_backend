const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const { generateToken, blacklistToken } = require("../config/generateToken.js");
const { User, NotificationMessages, AdminDashboard, WebNotification } = require("../models/userModel.js");
const Category = require("../models/categoryModel.js");
const Review = require("../models/reviewModel.js");
const BankDetails = require("../models/bankdetailsModel.js");
const Transaction = require("../models/transactionModel");
const { AdminNotificationMessages } = require("../models/adminnotificationsmodel.js");
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
const { addDays, isWeekend, addMonths, getMonth, getDay } = require("date-fns");
const { sendFCMNotification } = require("./notificationControllers");
const { addNotification } = require("./teacherNotificationController");
const TeacherNotification = require("../models/teacherNotificationModel");

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

function sendOTP(name, mobile, otp) {
  console.log(name);
  console.log(mobile);

  const options = {
    method: "POST",
    hostname: "control.msg91.com",
    port: null,
    path: `/api/v5/otp?template_id=${process.env.TEMPLATE_ID}&mobile=91${mobile}&authkey=${process.env.MSG91_API_KEY}&realTimeResponse=1`,
    headers: {
      "Content-Type": "application/json",
    },
  };

  const req = http.request(options, function (res) {
    const chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      const body = Buffer.concat(chunks);
      console.log(body.toString());
    });
  });

  const payload = JSON.stringify({
    name: name,
    OTP: otp,
  });

  req.write(payload);
  req.end();
}

const registerUser = asyncHandler(async (req, res, next) => {
  req.uploadPath = "uploads/profiles";
  upload.single("profile_pic")(req, res, async (err) => {
    if (err) {
      return next(new ErrorHandler(err.message, 400));
    }

    const { first_name, last_name, email, mobile, password, cpassword, role, firebase_token } = req.body;
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

    //const { token, id } = await createConnectyCubeUser(mobile, password, email, full_name, role);

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
      firebase_token,
      profile_pic, // Add profile_pic field
      // ConnectyCube_token: token,
      // ConnectyCube_id: id,
    });

    if (user) {
      sendOTP(full_name, mobile, otp);
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
        otp: user.otp,
        firebase_token,
        profile_pic: user.profile_pic, // Include profile_pic in response
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
    sendOTP(userdata.full_name, mobile, otp);
    await User.updateOne({ _id: userdata._id }, { $set: { otp } });
    // throw new ErrorHandler("OTP Not verified", 400);
    res.status(400).json({
      otp,
      message: "OTP Not verified",
      status: false,
    });
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

    if (userdata.deleted_at) {
      res.status(401).json({
        message: "Admin has deactive you please contact admin",
        type: "deactive",
        status: false,
      });
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
      ...userdata.toObject(),
      profile_pic: userdata.profile_pic, // No base URL added here
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

    // Create ConnectyCube user after OTP is verified
    const { token, id } = await createConnectyCubeUser(mobile, user.password, user.email, user.full_name, user.role);

    // Update the user's otp_verified field to 1 (OTP verified)
    // Update the user's otp_verified field and ConnectyCube credentials
    const result = await User.updateOne(
      { _id: user._id },
      {
        $set: {
          otp_verified: 1,
          ConnectyCube_token: token,
          ConnectyCube_id: id,
        },
      }
    );

    if (result.nModified > 0) {
      console.log("OTP verification status updated successfully.");
    } else {
      console.log("No matching user found or OTP verification status already set.");
    }

    // Retrieve the updated user document
    const updatedUser = await User.findById(user._id);

    const authToken = jwt.sign({ _id: updatedUser._id, role: updatedUser.role }, process.env.JWT_SECRET);

    res.json({
      user: updatedUser,
      token: authToken,
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
  sendOTP(user.first_name, mobile, newOTP);
  if (!user) {
    throw new ErrorHandler("User Not Found. ", 400);
  }

  // Update the user's otp field with the new OTP
  const result = await User.updateOne({ _id: user._id }, { $set: { otp: newOTP } });

  // Send the new OTP to the user (you can implement this logic)

  res.json({
    message: "New OTP sent successfully.",
    newOTP,
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

  sendOTP(user.first_name, mobile, newOTP);
  if (!user) {
    res.status(200).json({
      message: "User Not Found.",
      status: false,
    });
    return;
  }

  const result = await User.updateOne({ _id: user._id }, { $set: { otp: newOTP } });

  // Send the new OTP to the user (you can implement this logic)

  res.status(200).json({
    message: "New OTP sent successfully.",
    otp: newOTP,
    status: true,
  });
});

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
    updateUser: result,
    status: true,
  });
});

const ChangePassword = asyncHandler(async (req, res, next) => {
  const userId = req.headers.userID; // Assuming you have user authentication middleware
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword || !userId) {
    return next(new ErrorHandler("Please enter all the required fields.", 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new ErrorHandler("New password and confirm password do not match.", 400));
  }

  // Find the user by _id
  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User Not Found.", 400));
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update the password in MongoDB
  try {
    const result = await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

    res.status(201).json({
      message: "Password changed successfully.",
      status: true,
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to update password in MongoDB.", 500));
  }
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
  const { teacher_id } = req.params; // Extracting user_id from request parameters

  try {
    // Find bank details for the given user ID
    const bankDetails = await BankDetails.findOne({ userId: teacher_id });

    if (bankDetails) {
      res.status(200).json({
        bankDetails,
        status: true,
      });
    } else {
      res.status(404).json({
        message: "Bank details not found for the user",
        status: false,
      });
    }
  } catch (error) {
    console.error("Error fetching bank details:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({ role: "student" }).skip(skip).limit(Number(limit));
    const totalUsers = await User.countDocuments({ role: "student" });

    const transformedUsersPromises = users.map(async (user) => {
      let transformedUser = { ...user.toObject() };
      if (transformedUser.pic) {
        const getSignedUrl_pic = await getSignedUrlS3(transformedUser.pic);
        transformedUser.pic = getSignedUrl_pic;
      }
      if (transformedUser.watch_time) {
        transformedUser.watch_time = convertSecondsToReadableTimeAdmin(transformedUser.watch_time);
      }
      return { user: transformedUser };
    });

    const transformedUsers = await Promise.all(transformedUsersPromises);

    res.json({
      Users: transformedUsers,
      total_rows: totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getAllSearchTeachers = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const user_id = req.headers.userID;

    // Search keyword from query params
    const searchKeyword = req.query.search || "";
    const categoryKeyword = req.query.category_id || "";

    // Fetch the list of teacher IDs from the Course table that match the category_id
    const courses = await Course.find({ category_id: categoryKeyword }).select("teacher_id");
    const teacherIds = courses.map((course) => course.teacher_id.toString());

    // Query to find teachers based on the search keyword, category, and deleted_at null
    const query = {
      role: "teacher",
      deleted_at: null,
      _id: { $in: teacherIds },
      $or: [{ first_name: { $regex: searchKeyword, $options: "i" } }, { last_name: { $regex: searchKeyword, $options: "i" } }],
    };

    const teachers = await User.find(query)
      .populate({
        path: "payment_id",
      })
      .skip(skip)
      .limit(limit);

    const totalTeachers = await User.countDocuments(query);

    // Fetch the user's favorite teachers
    const favorite = await Favorite.findOne({ user_id });

    const favoriteTeacherIds = favorite ? favorite.teacher_ids.map((id) => id.toString()) : [];

    // Map each teacher to an array of promises
    const transformedTeachersPromises = teachers.map(async (teacher) => {
      let transformedTeacher = { ...teacher.toObject() }; // Convert Mongoose document to plain JavaScript object
      if (transformedTeacher.watch_time) {
        transformedTeacher.watch_time = convertSecondsToReadableTimeAdmin(transformedTeacher.watch_time);
      }

      // Determine the payment type dynamically based on payment_id
      if (transformedTeacher.payment_id) {
        let paymentType;
        let paymentAmount;

        if (transformedTeacher.payment_id.advance !== undefined) {
          paymentType = "advance";
          paymentAmount = transformedTeacher.payment_id.advance;
        } else if (transformedTeacher.payment_id.master !== undefined) {
          paymentType = "master";
          paymentAmount = transformedTeacher.payment_id.master;
        } else {
          // Handle case where neither advance nor master is defined
          paymentType = null;
          paymentAmount = null;
        }

        transformedTeacher.payment = {
          type: paymentType,
          amount: paymentAmount,
        };
        delete transformedTeacher.payment_id; // Remove payment_id from the teacher object
      } else {
        transformedTeacher.payment = {
          type: null,
          amount: null,
        };
      }

      // Add favorite field
      transformedTeacher.favorite = favoriteTeacherIds.includes(teacher._id.toString());

      return { teacher: transformedTeacher };
    });

    // Execute all promises concurrently
    const transformedTeachers = await Promise.all(transformedTeachersPromises);

    res.json({
      Teachers: transformedTeachers,
      total_rows: totalTeachers,
      current_page: page,
      total_pages: Math.ceil(totalTeachers / limit),
    });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal Server Error",
        status: false,
      });
    }
  }
});

const getAllTeachersByAdmin = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const user_id = req.headers.userid;

    // Search keyword from query params
    const searchKeyword = req.query.search || "";
    const categoryKeyword = req.query.category || "";

    const query = {
      role: "teacher",
      $or: [{ first_name: { $regex: searchKeyword, $options: "i" } }, { last_name: { $regex: searchKeyword, $options: "i" } }],
    };

    const teachers = await User.find(query).skip(skip).limit(limit);

    const totalTeachers = await User.countDocuments(query);

    // Fetch the user's favorite teachers
    const favorite = await Favorite.findOne({ user_id });

    const favoriteTeacherIds = favorite ? favorite.teacher_ids.map((id) => id.toString()) : [];

    // Map each teacher to an array of promises
    const transformedTeachersPromises = teachers.map(async (teacher) => {
      let transformedTeacher = { ...teacher.toObject() }; // Convert Mongoose document to plain JavaScript object

      // Add favorite field
      transformedTeacher.favorite = favoriteTeacherIds.includes(teacher._id.toString());
      console.log(teacher);

      let paymentDetails = {};

      // Fetch payment details from TeacherPayment model for groupPaymentId
      if (teacher.groupPaymentId) {
        const groupPayment = await TeacherPayment.findById(teacher.groupPaymentId);
        console.log(groupPayment);

        if (groupPayment) {
          paymentDetails.groupPayment = {
            type: groupPayment.type,
            amount: groupPayment.amount,
            payment_Id: groupPayment._id,
          };
        }
      }

      // Fetch payment details from TeacherPayment model for singlePaymentId
      if (teacher.singlePaymentId) {
        const singlePayment = await TeacherPayment.findById(teacher.singlePaymentId);
        console.log(singlePayment);
        if (singlePayment) {
          paymentDetails.singlePayment = {
            type: singlePayment.type,
            amount: singlePayment.amount,
            payment_Id: singlePayment._id,
          };
        }
      }

      // Add debug log to inspect payment details
      console.log("Payment Details:", paymentDetails);

      transformedTeacher.payment = paymentDetails;

      return transformedTeacher;
    });

    // Execute all promises concurrently
    const transformedTeachers = await Promise.all(transformedTeachersPromises);

    res.json({
      Teachers: transformedTeachers,
      total_rows: totalTeachers,
      current_page: page,
      total_pages: Math.ceil(totalTeachers / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
    });
  }
});

const getAllTeachersInAdmin = asyncHandler(async (req, res) => {
  try {
    const query = { role: "teacher" }; // Condition added to fetch only teachers

    const users = await User.find(query).populate({
      path: "payment_id",
    });

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

    res.json({
      Users: transformedUsers,
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
    const teacherCount = await User.countDocuments({ role: "teacher" });
    const studentCount = await User.countDocuments({ role: "student" });
    const courseCount = await Course.countDocuments();
    const teacherNotificationCount = await TeacherNotification.countDocuments();
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
      teacherCount: teacherCount,
      studentCount: studentCount,
      courseCount: courseCount,
      teacherNotificationCount: teacherNotificationCount,
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

// const UserAdminStatus = asyncHandler(async (req, res) => {
//   const userId = req.body.userId;
//   try {
//     // Find the video by its _id
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     // Check if deleted_at field is null or has a value
//     if (user.deleted_at === null) {
//       const updatedUser = await User.findByIdAndUpdate(
//         userId,
//         {
//           $set: {
//             deleted_at: new Date(),
//           },
//         },
//         { new: true }
//       );

//       const firebase_token = user.firebase_token;
//       console.log("Deactivated");
//       // Check if teacher has a firebase_token
//       if (firebase_token) {
//         const registrationToken = firebase_token;
//         const title = `${user.full_name} Deactivated`;
//         const body = `${user.full_name} Deactivated`;

//         // Send notification
//         const notificationResult = await sendFCMNotification(registrationToken, title, body);
//         if (notificationResult.success) {
//           console.log("Notification sent successfully:", notificationResult.response);
//         } else {
//           console.error("Failed to send notification:", notificationResult.error);
//         }
//         await addNotification(null, userId, "Status Deactivated", null, null);
//       }
//     } else {
//       const updatedUser = await User.findByIdAndUpdate(
//         userId,
//         {
//           $set: {
//             deleted_at: null,
//           },
//         },
//         { new: true }
//       );
//       const firebase_token = user.firebase_token;
//       console.log("Activated");
//       // Check if teacher has a firebase_token
//       if (firebase_token) {
//         const registrationToken = firebase_token;
//         const title = `${user.full_name} Activated`;
//         const body = `${user.full_name} Activated`;

//         // Send notification
//         const notificationResult = await sendFCMNotification(registrationToken, title, body);
//         if (notificationResult.success) {
//           console.log("Notification sent successfully:", notificationResult.response);
//         } else {
//           console.error("Failed to send notification:", notificationResult.error);
//         }
//         await addNotification(null, userId, "Status Activated", null, null);
//       }
//     }
//     return res.status(200).json({
//       message: "User soft delete status toggled successfully",
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// });

const UserAdminStatus = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  try {
    // Find the user by its _id
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newDeletedAt = user.deleted_at === null ? new Date() : null;

    // Update user's deleted_at field
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: { deleted_at: newDeletedAt } }, { new: true });

    // Find all courses by the user and update their deleted_at field
    await Course.updateMany({ teacher_id: userId }, { $set: { deleted_at: newDeletedAt } });

    // Handle FCM notification for user
    if (user.firebase_token) {
      const registrationToken = user.firebase_token;
      const active = "Your account has been activated by an administrator.";
      const deactive = "Your account has been deactivated by an administrator. Please contact support for assistance.";
      const title = `${user.full_name} ${newDeletedAt ? "Deactivated" : "Activated"}`;
      const body = `${user.full_name} ${newDeletedAt ? deactive : active}`;

      const notificationResult = await sendFCMNotification(registrationToken, title, body);
      if (notificationResult.success) {
        console.log("Notification sent successfully:", notificationResult.response);
      } else {
        console.error("Failed to send notification:", notificationResult.error);
      }
      await addNotification(null, userId, `${newDeletedAt ? deactive : active}`, null, null);
    }

    // Handle FCM notification for each course of the user
    const courses = await Course.find({ teacher_id: userId });
    for (const course of courses) {
      if (course.firebase_token) {
        const registrationToken = course.firebase_token;
        const title = `Course ${newDeletedAt ? "Deactivated" : "Activated"}`;
        const body = `The course "${course.title}" has been ${newDeletedAt ? "deactivated" : "activated"}.`;

        const notificationResult = await sendFCMNotification(registrationToken, title, body);
        if (notificationResult.success) {
          console.log("Notification sent successfully:", notificationResult.response);
        } else {
          console.error("Failed to send notification:", notificationResult.error);
        }
        await addNotification(null, userId, `Course ${newDeletedAt ? "Deactivated" : "Activated"}`, course.title, null);
      }
    }

    return res.status(200).json({
      message: "User and their courses' soft delete status toggled successfully",
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
  try {
    const { page = 1, limit = 10 } = req.query;
    console.log(req.query);

    // Fetch courses with pagination
    const courses = await Course.find()
      .sort({ _id: -1 })
      .populate("category_id")
      .populate("teacher_id")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Transform the courses as per requirements
    const transformedCoursesPromises = courses.map(async (course) => {
      let transformedCourse = { ...course.toObject() }; // Convert Mongoose document to plain JavaScript object

      // Fetch subcategory name
      const category = await Category.findById(transformedCourse.category_id);
      if (category) {
        const subCategory = category.subcategories.id(transformedCourse.sub_category_id);
        if (subCategory) {
          transformedCourse.category_name = category.category_name;
          transformedCourse.subcategory_name = subCategory.subcategory_name;
          transformedCourse.category_image = category.category_image;
        }
      }

      // Format startDate and endDate
      transformedCourse.startDate = moment(course.startDate).format("YYYY/MM/DD");
      transformedCourse.endDate = moment(course.endDate).format("YYYY/MM/DD");

      // Remove the category and subcategory objects from the response if needed
      delete transformedCourse.category_id.subcategories;
      delete transformedCourse.sub_category_id;

      return {
        _id: transformedCourse._id,
        title: transformedCourse.title,
        category_name: transformedCourse.category_name,
        subcategory_name: transformedCourse.subcategory_name,
        category_image: transformedCourse.category_image,
        type: transformedCourse.type,
        startTime: transformedCourse.startTime,
        endTime: transformedCourse.endTime,
        startDate: transformedCourse.startDate,
        endDate: transformedCourse.endDate,
        teacher: transformedCourse.teacher_id,
        createdAt: transformedCourse.createdAt,
        updatedAt: transformedCourse.updatedAt,
        deleted_at: transformedCourse.deleted_at,
      };
    });

    // Execute all promises concurrently
    const transformedCourses = await Promise.all(transformedCoursesPromises);

    // Get total documents count
    const total = await Course.countDocuments();

    res.json({
      data: transformedCourses,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
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

    console.log(courses);

    const totalCount = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    const transformedCoursesPromises = courses.map(async (course) => {
      let transformedCourse = { ...course.toObject() }; // Convert Mongoose document to plain JavaScript object

      if (transformedCourse.startTime && transformedCourse.startDate) {
        transformedCourse.startTime = moment(`${transformedCourse.startDate} ${transformedCourse.startTime}`, "YYYY/MM/DD h:mm A").format("DD/MM/YYYY h:mm A");
      }
      if (transformedCourse.endTime && transformedCourse.endDate) {
        transformedCourse.endTime = moment(`${transformedCourse.endDate} ${transformedCourse.endTime}`, "YYYY/MM/DD h:mm A").format("DD/MM/YYYY h:mm A");
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

const addMasterSinglePayment = asyncHandler(async (req, res, next) => {
  let { master_single } = req.body;

  // Convert string values to numbers if they exist
  master_single = master_single ? parseFloat(master_single) : undefined;

  if (isNaN(master_single) || master_single === 0) {
    return next(new ErrorHandler("Please enter a valid master payment amount.", 400));
  }

  const masterSinglePayment = new TeacherPayment({
    type: "master_single", // Set type
    amount: master_single, // Set amount
  });

  await masterSinglePayment.save();

  res.status(200).json({
    message: "Master Single payment added successfully",
    masterSinglePayment,
    status: true,
  });
});

const addMasterGroupPayment = asyncHandler(async (req, res, next) => {
  let { master_group } = req.body;

  // Convert string values to numbers if they exist
  master_group = master_group ? parseFloat(master_group) : undefined;

  if (isNaN(master_group) || master_group === 0) {
    return next(new ErrorHandler("Please enter a valid master payment amount.", 400));
  }

  const masterGroupPayment = new TeacherPayment({
    type: "master_group", // Set type
    amount: master_group, // Set amount
  });

  await masterGroupPayment.save();

  res.status(200).json({
    message: "Master Group payment added successfully",
    masterGroupPayment,
    status: true,
  });
});
const updateMasterSinglePayment = asyncHandler(async (req, res, next) => {
  let { master_single, id } = req.body;

  // Convert string values to numbers if they exist
  master_single = master_single ? parseFloat(master_single) : undefined;

  if (isNaN(master_single) || master_single === 0) {
    return next(new ErrorHandler("Please enter a valid master_single payment amount.", 400));
  }

  const masterSinglePayment = await TeacherPayment.findOneAndUpdate(
    { _id: id, type: "master_single" }, // Find document with specific type
    { amount: master_single }, // Update amount field
    { new: true, runValidators: true } // Return the updated document and run validators
  );

  if (!masterSinglePayment) {
    return next(new ErrorHandler("Master payment not found.", 404));
  }

  res.status(200).json({
    message: "Master Single payment updated successfully",
    masterSinglePayment,
    status: true,
  });
});

const updateMasterGroupPayment = asyncHandler(async (req, res, next) => {
  let { master_group, id } = req.body;
  console.log(req.body);
  // Convert string values to numbers if they exist
  master_group = master_group ? parseFloat(master_group) : undefined;

  if (isNaN(master_group) || master_group === 0) {
    return next(new ErrorHandler("Please enter a valid master_group payment amount.", 400));
  }

  const masterGroupPayment = await TeacherPayment.findById(id);

  if (!masterGroupPayment) {
    return next(new ErrorHandler("Master payment not found.", 404));
  }

  masterGroupPayment.master_group = master_group;

  await masterGroupPayment.save();

  res.status(200).json({
    message: "Master payment updated successfully",
    masterGroupPayment,
    status: true,
  });
});

const addAdvanceSinglePayment = asyncHandler(async (req, res, next) => {
  let { advance_single } = req.body;

  // Convert string values to numbers if they exist
  advance_single = advance_single ? parseFloat(advance_single) : undefined;

  if (isNaN(advance_single) || advance_single === 0) {
    return next(new ErrorHandler("Please enter a valid advance payment amount.", 400));
  }

  const advanceSinglePayment = new TeacherPayment({
    type: "advance_single", // Set type
    amount: advance_single, // Set amount
  });

  await advanceSinglePayment.save();

  res.status(200).json({
    message: "Advance Single payment added successfully",
    advanceSinglePayment,
    status: true,
  });
});
const addAdvanceGroupPayment = asyncHandler(async (req, res, next) => {
  let { advance_group } = req.body;

  // Convert string values to numbers if they exist
  advance_group = advance_group ? parseFloat(advance_group) : undefined;

  if (isNaN(advance_group) || advance_group === 0) {
    return next(new ErrorHandler("Please enter a valid advance payment amount.", 400));
  }

  const advanceGroupPayment = new TeacherPayment({
    type: "advance_group", // Set type
    amount: advance_group, // Set amount
  });

  await advanceGroupPayment.save();

  res.status(200).json({
    message: "Advance Group payment added successfully",
    advanceGroupPayment,
    status: true,
  });
});

const updateAdvanceSinglePayment = asyncHandler(async (req, res, next) => {
  let { advance_single, id } = req.body;

  // Convert string values to numbers if they exist
  advance_single = advance_single ? parseFloat(advance_single) : undefined;

  if (isNaN(advance_single) || advance_single === 0) {
    return next(new ErrorHandler("Please enter a valid advance_single payment amount.", 400));
  }

  const advanceSinglePayment = await TeacherPayment.findById(id);

  if (!advanceSinglePayment) {
    return next(new ErrorHandler("Advance payment not found.", 404));
  }

  advanceSinglePayment.advance_single = advance_single;

  await advanceSinglePayment.save();

  res.status(200).json({
    message: "Advance payment updated successfully",
    advanceSinglePayment,
    status: true,
  });
});

const updateAdvanceGroupPayment = asyncHandler(async (req, res, next) => {
  let { advance_group, id } = req.body;
  console.log(req.body);
  // Convert string values to numbers if they exist
  advance_group = advance_group ? parseFloat(advance_group) : undefined;

  if (isNaN(advance_group) || advance_group === 0) {
    return next(new ErrorHandler("Please enter a valid advance_group payment amount.", 400));
  }

  const advanceGroupPayment = await TeacherPayment.findById(id);

  if (!advanceGroupPayment) {
    return next(new ErrorHandler("Advance payment not found.", 404));
  }

  advanceGroupPayment.advance_group = advance_group;

  await advanceGroupPayment.save();

  res.status(200).json({
    message: "Advance payment updated successfully",
    advanceGroupPayment,
    status: true,
  });
});

const getMasterAndAdvancePayments = asyncHandler(async (req, res) => {
  try {
    const payments = await TeacherPayment.find({});
    console.log("Raw payments:", payments);

    // Transform payments into the desired format
    const formattedPayments = payments.map((payment) => {
      // Return the payment in the desired format based on the `type` field
      return {
        _id: payment._id,
        Payment: payment.amount,
        Type: payment.type,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };
    });

    console.log("Formatted payments:", formattedPayments);

    res.status(200).json({
      message: "Payments retrieved successfully",
      payments: formattedPayments,
    });
  } catch (error) {
    console.error("Error retrieving payments:", error);
    return next(new ErrorHandler("Unable to retrieve payments.", 500));
  }
});

const getSinglePayments = asyncHandler(async (req, res) => {
  try {
    const singlePayments = await TeacherPayment.find({
      type: { $in: ["master_single", "advance_single"] },
    });

    const formattedPayments = singlePayments.map((payment) => ({
      _id: payment._id,
      Payment: payment.amount,
      Type: payment.type,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));

    res.status(200).json({
      message: "Single payments retrieved successfully",
      payments: formattedPayments,
    });
  } catch (error) {
    console.error("Error retrieving single payments:", error);
    return next(new ErrorHandler("Unable to retrieve single payments.", 500));
  }
});

const getGroupPayments = asyncHandler(async (req, res) => {
  try {
    const groupPayments = await TeacherPayment.find({
      type: { $in: ["master_group", "advance_group"] },
    });

    const formattedPayments = groupPayments.map((payment) => ({
      _id: payment._id,
      Payment: payment.amount,
      Type: payment.type,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));

    res.status(200).json({
      message: "Group payments retrieved successfully",
      payments: formattedPayments,
    });
  } catch (error) {
    console.error("Error retrieving group payments:", error);
    return next(new ErrorHandler("Unable to retrieve group payments.", 500));
  }
});


const updateUserPayment = async (req, res, next) => {
  const { userId, groupPaymentId, singlePaymentId } = req.body;

  if (!userId || !groupPaymentId || !singlePaymentId) {
    return next(new ErrorHandler("Please provide userId, groupPaymentId, and singlePaymentId.", 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  // Update user's payment IDs
  user.groupPaymentId = groupPaymentId;
  user.singlePaymentId = singlePaymentId;
  user.updatedAt = Date.now();

  const updatedUser = await user.save();
  if (updatedUser) {
    // Check if user has a firebase_token
    if (updatedUser.firebase_token) {
      const registrationToken = updatedUser.firebase_token;
      const title = `${updatedUser.full_name} Payment Updated`;
      const body = `${updatedUser.full_name} Payment Updated`;

      // Send notification
      const notificationResult = await sendFCMNotification(registrationToken, title, body);

      if (notificationResult.success) {
        console.log("Notification sent successfully:", notificationResult.response);
      } else {
        console.error("Failed to send notification:", notificationResult.error);
      }
      await addNotification(null, userId, "Payment Updated", null, null);
    }
  }

  res.status(200).json({
    _id: user._id,
    groupPaymentId: user.groupPaymentId,
    singlePaymentId: user.singlePaymentId,
    updatedAt: user.updatedAt,
  });
};

const getTeacherAndCourseByTeacher_IdAndType = async (req, res, next) => {
  const { teacher_id, type } = req.body;
  const user_id = req.headers.userID;
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
      deleted_at: null,
    });

    console.log(courses);

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

    // Check course availability
    const coursesWithAvailability = courses.map((course) => {
      let courseAvailable;
      if (course.type === "group_course") {
        courseAvailable = course.userIds.length < 3 ? "available" : "full";
      } else if (course.type === "single_course") {
        courseAvailable = course.userIds.length < 1 ? "available" : "full";
      }

      // Check if the user has already taken a demo
      const askDemo = course.askdemoid.includes(user_id);

      // Calculate days array between startDate and endDate
      const daysArray = calculateDaysArray(course.startDate, course.endDate);

      return {
        ...course.toObject(),
        courseAvailable,
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
        askDemo,
        days: daysArray,
        course_image: course.course_image,
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
      match: { deleted_at: null },
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

const getTeachersBySubcategory = asyncHandler(async (req, res) => {
  const { subcategory_id } = req.body;
  const user_id = req.headers.userID;
  const { search } = req.query; // Assuming search query parameter for teacher name search

  const teacher_ids = user_id;

  const teacherNotificationData = await TeacherNotification.find({ teacher_id: teacher_ids });
  const unreadCount = teacherNotificationData.filter((notification) => !notification.read).length;

  if (!subcategory_id || !user_id) {
    return res.status(400).json({ message: "Invalid input", notificationCount: unreadCount });
  }

  try {
    // Find courses with the given subcategory_id
    const courses = await Course.find({
      sub_category_id: subcategory_id,
      deleted_at: null,
    }).populate("teacher_id");

    if (!courses.length) {
      return res.status(404).json({
        message: "No courses found for the given subcategory ID",
        notificationCount: unreadCount,
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

    res.status(200).json({ teachers: teachersWithDetails, notificationCount: unreadCount });
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

  let courseQuery = {
    deleted_at: null,
    $or: [{ userIds: user_id }, { askDemoids: user_id }],
  };

  if (sub_category_id) {
    courseQuery["sub_category_id"] = sub_category_id;
  }

  try {
    // Find courses based on the user and sub-category conditions
    const courses = await Course.find(courseQuery)
      .populate({
        path: "teacher_id",
        model: "User",
        select: "full_name profile_pic",
      })
      .exec();

    if (!courses.length) {
      return res.status(404).json({
        message: "No courses found for the given user ID and sub-category ID",
      });
    }

    // Find transactions for the user to get purchase dates
    const transactions = await Transaction.find({ user_id }).exec();

    const coursesWithDetails = await Promise.all(
      courses.map(async (course) => {
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

        // Fetch the user details based on userIds
        const userIds = course.userIds || [];
        const users = await User.find({ _id: { $in: userIds } }).select("firebase_token email profile_pic ConnectyCube_token ConnectyCube_id full_name");

        // Find the purchase date from the transactions
        const transaction = transactions.find((trans) => trans.course_id.equals(course._id));
        const purchaseDate = transaction ? transaction.datetime : null;

        return {
          ...course.toObject(),
          teacher: {
            ...teacher.toObject(),
            averageRating,
            userHasRated: !!userRating,
            userRating: userRating ? userRating.rating : null,
          },
          users,
          purchaseDate,
          course_image: course.course_image,
        };
      })
    );

    res.status(200).json({ courses: coursesWithDetails });
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

const updateCourseWithDemoId = asyncHandler(async (req, res) => {
  const user_id = req.headers.userID;
  const { teacher_id, course_id } = req.body;

  if (!teacher_id || !course_id || !user_id) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    const course = await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if the user has already taken a demo for this course
    if (course.askdemoid.includes(user_id)) {
      return res.status(400).json({
        message: "You have already taken a demo for this course",
        status: false,
      });
    }

    // Check if the teacher is associated with the course
    if (course.teacher_id.toString() !== teacher_id) {
      return res.status(403).json({ message: "Teacher not authorized for this course" });
    }

    // Add user_id to askdemoid array if not already present
    if (!course.askdemoid) {
      course.askdemoid = [];
    }

    if (!course.askdemoid.includes(user_id)) {
      course.askdemoid.push(user_id);
      await course.save();
    }

    res.status(200).json({
      message: "User ID added to askdemoid successfully",
      course,
    });
  } catch (error) {
    console.error("Error updating course:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const askForDemo = asyncHandler(async (req, res) => {
  const user_id = req.headers.userID;
  console.log(user_id);
  const { course_id, type } = req.body;

  if (!user_id || !course_id || !type) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    const course = await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if the user has already purchased the course
    if (course.askDemoids.includes(user_id) && course.completeAskDemoids.includes(user_id)) {
      return res.status(400).json({
        message: "You have already Demo this course",
        status: false,
      });
    }

    if (type == "askDemoids") {
      if (!course.askDemoids.includes(user_id)) {
        // Update Course with userId if not already included
        course.askDemoids.push(user_id);
        await course.save();
      }
    } else if (type == "completeAskDemoids") {
      if (!course.completeAskDemoids.includes(user_id)) {
        // Update Course with userId if not already included
        course.completeAskDemoids.push(user_id);
        await course.save();
      }
    }

    res.status(201).json({
      message: "Demo added successfully",
      course: course,
    });
  } catch (error) {
    console.error("Error adding Demo:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

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
  UserAdminStatus,
  ManullyListUpdate,
  UpdateMobileAdmin,
  updateAllUsersFullName,
  Put_Profile_Pic_munally,
  Delete_DeleteSignedUrlS3,
  getAllSearchTeachers,
  getAllCourse,
  getCoursesByTeacherId,
  getMasterAndAdvancePayments,
  addAdvanceSinglePayment,
  addAdvanceGroupPayment,
  addMasterSinglePayment,
  addMasterGroupPayment,
  updateMasterSinglePayment,
  updateMasterGroupPayment,
  updateAdvanceSinglePayment,
  updateAdvanceGroupPayment,
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
  getAllTeachersInAdmin,
  updateCourseWithDemoId,
  askForDemo,
  getAllTeachersByAdmin,
  getSinglePayments,
  getGroupPayments,
};
