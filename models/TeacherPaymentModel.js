const mongoose = require("mongoose");

const teacherPaymentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["master_single", "master_group", "advance_single", "advance_group"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const TeacherPayment = mongoose.model("TeacherPayment", teacherPaymentSchema);

module.exports = TeacherPayment;
