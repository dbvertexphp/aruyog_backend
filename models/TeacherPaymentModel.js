const mongoose = require("mongoose");

const teacherPaymentSchema = new mongoose.Schema(
  {
    master: {
      type: Number,
      required: true,
      default: 0,
    },
    advance: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const TeacherPayment = mongoose.model("TeacherPayment", teacherPaymentSchema);

module.exports = TeacherPayment;
