const express = require("express");
const protect = require("../middleware/authMiddleware.js");
const Authorization = require("../middleware/Authorization.middleware.js");
const { updateTeacherProfileData, addCourse, getTodayCourse, getMyClasses, getTeacherProfileData, updateCourseDates, getTeacherProfileDataByTeacherId, CourseActiveStatus, autoDeactivateCourses,teacherUnavailabilityDate, updateTeacherDocument,getteacherUnavailabilityDateById } = require("../controllers/teacherController.js");

const teacherRoutes = express.Router();

// Apply protect and Authorization middleware to updateTeacherProfile route
teacherRoutes.put("/updateTeacherProfile", protect, Authorization(["teacher"]), updateTeacherProfileData);
teacherRoutes.get("/getTeacherProfileData", protect, getTeacherProfileData);
teacherRoutes.put("/addCourse", protect, Authorization(["teacher"]), addCourse);

teacherRoutes.route("/getTodayCourse").get(protect, Authorization(["teacher"]), getTodayCourse);
teacherRoutes.route("/getMyClasses").get(protect, Authorization(["teacher"]), getMyClasses);
teacherRoutes.route("/getTeacherProfileDataByTeacherId/:teacher_id").get(protect, getTeacherProfileDataByTeacherId);
teacherRoutes.route("/teacherUnavailabilityDate").post(protect, Authorization(["teacher"]), teacherUnavailabilityDate);
teacherRoutes.route("/updateTeacherDocument").post(protect, Authorization(["teacher"]), updateTeacherDocument);
teacherRoutes.route("/getteacherUnavailabilityDateById").post(protect, Authorization(["teacher"]), getteacherUnavailabilityDateById);


teacherRoutes.route("/updateCourseDates").post(protect, updateCourseDates);
teacherRoutes.route("/courseActiveStatus").post(protect, Authorization(["admin"]), CourseActiveStatus);
// teacherRoutes.route("/autoDeactivateCourses").post(autoDeactivateCourses);

module.exports = { teacherRoutes };
