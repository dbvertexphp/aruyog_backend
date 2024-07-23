const express = require("express");
const protect = require("../middleware/authMiddleware.js");
const Authorization = require("../middleware/Authorization.middleware.js");
const { updateTeacherProfileData, addCourse, getTodayCourse, getMyClasses, getTeacherProfileData, updateCourseDates, getTeacherProfileDataByTeacherId, CourseActiveStatus, autoDeactivateCourses } = require("../controllers/teacherController.js");

const teacherRoutes = express.Router();

// Apply protect and Authorization middleware to updateTeacherProfile route
teacherRoutes.put("/updateTeacherProfile", protect, Authorization(["teacher"]), updateTeacherProfileData);
teacherRoutes.get("/getTeacherProfileData", protect, Authorization(["teacher"]), getTeacherProfileData);
teacherRoutes.put("/addCourse", protect, Authorization(["teacher"]), addCourse);

teacherRoutes.route("/getTodayCourse").get(protect, Authorization(["teacher"]), getTodayCourse);
teacherRoutes.route("/getMyClasses").get(protect, Authorization(["teacher"]), getMyClasses);
teacherRoutes.route("/getTeacherProfileDataByTeacherId").post(protect, getTeacherProfileDataByTeacherId);

teacherRoutes.route("/updateCourseDates").post(protect, Authorization(["admin"]), updateCourseDates);
teacherRoutes.route("/courseActiveStatus").post(protect, Authorization(["admin"]), CourseActiveStatus);
// teacherRoutes.route("/autoDeactivateCourses").post(autoDeactivateCourses);

module.exports = { teacherRoutes };
