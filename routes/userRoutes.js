const express = require("express");
const {
  registerUser,
  authUser,
  getUsers,
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
  getBankDetailsAdmin,
  // updateUserWatchTime,
  UserAdminStatus,
  ManullyListUpdate,
  UpdateMobileAdmin,
  updateAllUsersFullName,
  Put_Profile_Pic_munally,
  Delete_DeleteSignedUrlS3,
  getAllTeachers,
} = require("../controllers/userControllers.js");
const { CreateCalendar, GetSpecialEntries, FindPriceByDateTime, GetNormalEntries } = require("../controllers/calendarControllers.js");
const { createHire, getHireListByUserId, updateHireStatus, getAllHireList, getHireByMe, HirePaymentUpdateStatus } = require("../controllers/hireControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");
const Authorization = require("../middleware/Authorization.middleware.js");

const userRoutes = express.Router();

userRoutes.route("/register").post(registerUser);
userRoutes.route("/login").post(authUser);
userRoutes.route("/verifyOtp").post(verifyOtp);
userRoutes.route("/resendOTP").post(resendOTP);
userRoutes.route("/ForgetresendOTP").post(ForgetresendOTP);
userRoutes.route("/forgetPassword").put(forgetPassword);

// student protect route
userRoutes.route("/ChangePassword").put(protect, Authorization(["student"]), ChangePassword);

userRoutes.route("/ManullyListUpdate").get(ManullyListUpdate);
userRoutes.route("/updateAllUsersFullName").get(updateAllUsersFullName);
userRoutes.route("/getAllUsersWebsite").post(commonProtect, getAllUsersWebsite);
/*------------- Comman Auth Routes --------------------- */
userRoutes.route("/getUserView/:_id/").get(commonProtect, getUserView);

userRoutes.route("/Profile_Pic_munally").get(Put_Profile_Pic_munally);
userRoutes.route("/Delete_DeleteSignedUrlS3").get(Delete_DeleteSignedUrlS3);
/*------------- Auth Routes --------------------- */

userRoutes.route("/").get(protect, getUsers);

userRoutes.route("/logoutUser").get(protect, logoutUser);
userRoutes.route("/updateUserProfile").put(protect, updateProfileData);
userRoutes.route("/searchUsers").post(protect, searchUsers);
userRoutes.route("/UpdateMobileAdmin").post(protect, UpdateMobileAdmin);
userRoutes.route("/profilePicUpload").put(protect, profilePicUpload);
userRoutes.route("/bankdetailsUpload").post(protect, bank_Detail_create);
userRoutes.route("/UserAdminStatus").post(protect, UserAdminStatus);
userRoutes.route("/getBankDetails").get(protect, getBankDetails);
userRoutes.route("/getBankDetailsAdmin").post(protect, getBankDetailsAdmin);
userRoutes.route("/addReview").post(protect, addReview);
// userRoutes.route("/updateUserWatchTime").post(protect, updateUserWatchTime);
userRoutes.route("/getReview/:id/:limit").get(getReview);
userRoutes.route("/Watch_time_update").post(protect, Watch_time_update);
userRoutes.route("/websiteNotificationToken").post(protect, websiteNotificationToken);
userRoutes.route("/NotificationList/:limit").get(protect, NotificationList);
userRoutes.route("/getNotificationId").post(protect, getNotificationId);
userRoutes.route("/getUnreadCount").get(protect, getUnreadCount);
userRoutes.route("/getProfilePicUploadUrlS3").get(protect, getProfilePicUploadUrlS3);
userRoutes.route("/profilePicKey").post(protect, profilePicKey);

/*------------- Calendar Routes --------------------- */
userRoutes.route("/Createcalendar").post(protect, CreateCalendar);
userRoutes.route("/FindPriceByDateTime").post(FindPriceByDateTime);
userRoutes.route("/GetSpecialEntries").get(protect, GetSpecialEntries);
userRoutes.route("/GetNormalEntries").get(protect, GetNormalEntries);
/*------------- Hire Routes --------------------- */
userRoutes.route("/createHire").post(protect, createHire);
userRoutes.route("/updateHireStatus").post(protect, updateHireStatus);
userRoutes.route("/HirePaymentUpdateStatus").post(protect, HirePaymentUpdateStatus);
userRoutes.route("/getHireList").get(protect, getHireListByUserId);
userRoutes.route("/getHireByMe").get(protect, getHireByMe);

/*------------- Admin Routes --------------------- */
userRoutes.route("/getAllUsers").post(protect, getAllUsers);
userRoutes.route("/getAllTeachers").post(protect, getAllTeachers);
userRoutes.route("/getAllHireList").post(protect, getAllHireList);
userRoutes.route("/updateProfileDataByAdmin").post(protect, updateProfileDataByAdmin);
userRoutes.route("/getAllDashboardCount").get(protect, getAllDashboardCount);

module.exports = { userRoutes };
