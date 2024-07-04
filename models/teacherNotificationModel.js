const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  amount: { type: Number, required: true },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const TeacherNotification = mongoose.model("TeacherNotification", notificationSchema);

module.exports = TeacherNotification;
