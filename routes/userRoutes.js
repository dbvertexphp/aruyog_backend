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
  getTeachersBySubcategory,
  getFavoriteTeachers,
  getCoursesByUserId,
  updateStudentProfileData,
  getStudentsPayment,
  getTotalAmount,
  getAllTeachersInAdmin,
  updateCourseWithDemoId,
  askForDemo,
} = require("../controllers/userControllers.js");
const { CreateCalendar, GetSpecialEntries, FindPriceByDateTime, GetNormalEntries } = require("../controllers/calendarControllers.js");
const { createHire, getHireListByUserId, updateHireStatus, getAllHireList, getHireByMe, HirePaymentUpdateStatus } = require("../controllers/hireControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");
const Authorization = require("../middleware/Authorization.middleware.js");
const { addRating, getRatingsByTeacherId } = require("../controllers/ratingController.js");
const { addTeacherPaymentStatus, getTeacherPaymentStatuses, calculatePayment, getTeacherPaymentStatusById } = require("../controllers/teacherPaymentStatusController.js");

const userRoutes = express.Router();

/*------------- Student/Teacher Both apis --------------------- */
userRoutes.route("/register").post(registerUser);
userRoutes.route("/login").post(authUser);
userRoutes.route("/verifyOtp").post(verifyOtp);
userRoutes.route("/resendOTP").post(resendOTP);
userRoutes.route("/ForgetresendOTP").post(ForgetresendOTP);
userRoutes.route("/forgetPassword").put(forgetPassword);
userRoutes.route("/ChangePassword").put(ChangePassword);
userRoutes.route("/logoutUser").get(logoutUser);

/*------------- Student/Admin Both apis --------------------- */
userRoutes.route("/getCoursesByUserId").get(protect, Authorization(["student"]), getCoursesByUserId);
userRoutes.route("/getAllUsers").get(protect, Authorization(["student", "admin"]), getAllUsers);
userRoutes.route("/updateStudentProfileData").post(protect, Authorization(["student"]), updateStudentProfileData);
userRoutes.route("/addFavoriteTeacher").post(protect, Authorization(["student"]), addFavoriteTeacher);
userRoutes.route("/removeFavoriteTeacher").post(protect, Authorization(["student"]), removeFavoriteTeacher);
userRoutes.route("/getTeachersBySubcategory").post(protect, Authorization(["student"]), getTeachersBySubcategory);
userRoutes.route("/getFavoriteTeachers").get(protect, Authorization(["student"]), getFavoriteTeachers);
userRoutes.route("/addRating").post(protect, Authorization(["student"]), addRating);
userRoutes.route("/getRatingsByTeacherId/:teacherId").get(protect, getRatingsByTeacherId);
userRoutes.route("/addReview").post(protect, Authorization(["student"]), addReview);
userRoutes.route("/updateCourseWithDemoId").post(protect, Authorization(["student"]), updateCourseWithDemoId);
userRoutes.route("/askForDemo").post(protect, Authorization(["student"]), askForDemo);

/*------------- Teacher/Admin Both apis --------------------- */
userRoutes.route("/getAllTeachers").get(protect, getAllTeachers);
userRoutes.route("/getTeacherAndCourseByTeacher_IdAndType").post(protect, Authorization(["student", "teacher"]), getTeacherAndCourseByTeacher_IdAndType);
userRoutes.route("/addBankDetails").post(protect, Authorization(["teacher"]), bank_Detail_create);
userRoutes.route("/getBankDetails").get(protect, Authorization(["teacher"]), getBankDetails);
userRoutes.route("/getBankDetailsAdmin/:teacher_id").get(protect, Authorization(["teacher", "admin"]), getBankDetailsAdmin);
userRoutes.route("/calculatePayment").post(protect, Authorization(["teacher"]), calculatePayment);

/*------------- Admin apis --------------------- */
userRoutes.route("/getTeacherPaymentStatuses").get(protect, Authorization(["admin"]), getTeacherPaymentStatuses);
userRoutes.route("/getTeacherPaymentStatusById/:teacher_id").get(protect, Authorization(["admin"]), getTeacherPaymentStatusById);
userRoutes.route("/addTeacherPaymentStatus").post(protect, Authorization(["admin"]), addTeacherPaymentStatus);
userRoutes.route("/addMasterPayment").post(protect, Authorization(["admin"]), addMasterPayment);
userRoutes.route("/updateMasterPayment").post(protect, Authorization(["admin"]), updateMasterPayment);
userRoutes.route("/getStudentsPayment").get(protect, Authorization(["admin"]), getStudentsPayment);
userRoutes.route("/getTotalAmount").get(protect, Authorization(["admin"]), getTotalAmount);
userRoutes.route("/addAdvancePayment").post(protect, Authorization(["admin"]), addAdvancePayment);
userRoutes.route("/updateAdvancePayment").post(protect, Authorization(["admin"]), updateAdvancePayment);
userRoutes.route("/getMasterAndAdvancePayments").get(protect, Authorization(["admin"]), getMasterAndAdvancePayments);
userRoutes.route("/updateUserPayment").put(protect, Authorization(["admin"]), updateUserPayment);
userRoutes.route("/getAllCourse").get(protect, Authorization(["admin"]), getAllCourse);
userRoutes.route("/getAllDashboardCount").get(protect, Authorization(["admin"]), getAllDashboardCount);

// student protect route
userRoutes.route("/ManullyListUpdate").get(ManullyListUpdate);
userRoutes.route("/updateAllUsersFullName").get(updateAllUsersFullName);
userRoutes.route("/getAllUsersWebsite").post(commonProtect, getAllUsersWebsite);
/*------------- Comman Auth Routes --------------------- */
userRoutes.route("/getUserView/:_id/").get(commonProtect, getUserView);

userRoutes.route("/Profile_Pic_munally").get(Put_Profile_Pic_munally);
userRoutes.route("/Delete_DeleteSignedUrlS3").get(Delete_DeleteSignedUrlS3);
/*------------- Auth Routes --------------------- */

userRoutes.route("/").get(protect, getUsers);

userRoutes.route("/updateUserProfile").put(protect, updateProfileData);
userRoutes.route("/searchUsers").post(protect, searchUsers);
userRoutes.route("/UpdateMobileAdmin").post(protect, UpdateMobileAdmin);
userRoutes.route("/profilePicUpload").put(protect, profilePicUpload);
userRoutes.route("/UserAdminStatus").post(protect, UserAdminStatus);

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

userRoutes.route("/getAllHireList").post(protect, getAllHireList);
userRoutes.route("/updateProfileDataByAdmin").post(protect, updateProfileDataByAdmin);
userRoutes.route("/getCoursesByTeacherId/:teacher_id").get(protect, getCoursesByTeacherId);

userRoutes.route("/getAllTeachersInAdmin").get(protect, getAllTeachersInAdmin);

module.exports = { userRoutes };
