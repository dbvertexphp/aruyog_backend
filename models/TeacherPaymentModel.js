const mongoose = require("mongoose");

const teacherPaymentSchema = new mongoose.Schema(
  {
    master_single: {
      type: Number,
    },
    master_group: {
      type: Number,
    },
    advance_single: {
      type: Number,
    },
    advance_group: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const TeacherPayment = mongoose.model("TeacherPayment", teacherPaymentSchema);

module.exports = TeacherPayment;
