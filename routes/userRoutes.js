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
  getAllSearchTeachers,
  getAllTeachersByAdmin,
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
  getTeachersBySubcategory,
  getFavoriteTeachers,
  getCoursesByUserId,
  updateStudentProfileData,
  getStudentsPayment,
  getTotalAmount,
  getAllTeachersInAdmin,
  updateCourseWithDemoId,
  askForDemo,
  getSinglePayments,
  getGroupPayments,
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
userRoutes.route("/ChangePassword").put(protect, ChangePassword);
userRoutes.route("/logoutUser").get(protect, logoutUser);

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
userRoutes.route("/getAllSearchTeachers").get(protect, getAllSearchTeachers);
userRoutes.route("/getAllTeachersByAdmin").get(protect, getAllTeachersByAdmin);
userRoutes.route("/getTeacherAndCourseByTeacher_IdAndType").post(protect, Authorization(["student", "teacher"]), getTeacherAndCourseByTeacher_IdAndType);
userRoutes.route("/addBankDetails").post(protect, Authorization(["teacher"]), bank_Detail_create);
userRoutes.route("/getBankDetails").get(protect, Authorization(["teacher"]), getBankDetails);
userRoutes.route("/getBankDetailsAdmin/:teacher_id").get(protect, Authorization(["teacher", "admin"]), getBankDetailsAdmin);
userRoutes.route("/calculatePayment").post(protect, Authorization(["teacher"]), calculatePayment);

/*------------- Admin apis --------------------- */
userRoutes.route("/getTeacherPaymentStatuses").get(protect, Authorization(["admin"]), getTeacherPaymentStatuses);
userRoutes.route("/getTeacherPaymentStatusById/:teacher_id").get(protect, Authorization(["admin"]), getTeacherPaymentStatusById);
userRoutes.route("/addTeacherPaymentStatus").post(protect, Authorization(["admin"]), addTeacherPaymentStatus);
userRoutes.route("/addMasterSinglePayment").post(protect, Authorization(["admin"]), addMasterSinglePayment);
userRoutes.route("/addMasterGroupPayment").post(protect, Authorization(["admin"]), addMasterGroupPayment);
userRoutes.route("/updateMasterSinglePayment").post(protect, Authorization(["admin"]), updateMasterSinglePayment);
userRoutes.route("/updateMasterGroupPayment").post(protect, Authorization(["admin"]), updateMasterGroupPayment);
userRoutes.route("/getStudentsPayment").get(protect, Authorization(["admin"]), getStudentsPayment);
userRoutes.route("/getTotalAmount").get(protect, Authorization(["admin"]), getTotalAmount);
userRoutes.route("/addAdvanceSinglePayment").post(protect, Authorization(["admin"]), addAdvanceSinglePayment);
userRoutes.route("/addAdvanceGroupPayment").post(protect, Authorization(["admin"]), addAdvanceGroupPayment);
userRoutes.route("/updateAdvanceSinglePayment").post(protect, Authorization(["admin"]), updateAdvanceSinglePayment);
userRoutes.route("/updateAdvanceGroupPayment").post(protect, Authorization(["admin"]), updateAdvanceGroupPayment);
userRoutes.route("/getMasterAndAdvancePayments").get(protect, Authorization(["admin"]), getMasterAndAdvancePayments);
userRoutes.route("/getSinglePayments").get(protect, Authorization(["admin"]), getSinglePayments);
userRoutes.route("/getGroupPayments").get(protect, Authorization(["admin"]), getGroupPayments);
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
