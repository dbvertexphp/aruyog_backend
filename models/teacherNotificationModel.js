const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  body: { type: String },
  title: { type: String },
  amount: { type: Number },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const TeacherNotification = mongoose.model("TeacherNotification", notificationSchema);

module.exports = TeacherNotification;
