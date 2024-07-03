const mongoose = require("mongoose");

const TeacherPaymentStatusSchema = new mongoose.Schema(
  {
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment_datetime: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const TeacherPaymentStatus = mongoose.model("TeacherPaymentStatus", TeacherPaymentStatusSchema);

module.exports = TeacherPaymentStatus;
