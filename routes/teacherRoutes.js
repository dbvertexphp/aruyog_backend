const express = require("express");
const protect = require("../middleware/authMiddleware.js");
const Authorization = require("../middleware/Authorization.middleware.js");
const { updateTeacherProfileData, addCourse } = require("../controllers/teacherController.js");

const teacherRoutes = express.Router();

// Apply protect and Authorization middleware to updateTeacherProfile route
teacherRoutes.put("/updateTeacherProfile", protect, Authorization(["teacher"]), updateTeacherProfileData);
teacherRoutes.put("/addCourse", protect, Authorization(["teacher"]), addCourse);

module.exports = { teacherRoutes };
