const express = require("express");
const protect = require("../middleware/authMiddleware.js");
const Authorization = require("../middleware/Authorization.middleware.js");
const { updateTeacherProfileData, addCourse, getTodayCourse, getMyClasses } = require("../controllers/teacherController.js");

const teacherRoutes = express.Router();

// Apply protect and Authorization middleware to updateTeacherProfile route
teacherRoutes.put("/updateTeacherProfile", protect, Authorization(["teacher"]), updateTeacherProfileData);
teacherRoutes.put("/addCourse", protect, Authorization(["teacher"]), addCourse);

teacherRoutes.route("/getTodayCourse").get(protect, Authorization(["teacher"]), getTodayCourse);
teacherRoutes.route("/getMyClasses").get(protect, Authorization(["teacher"]), getMyClasses);

module.exports = { teacherRoutes };
