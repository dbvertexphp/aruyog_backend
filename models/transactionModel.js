// models/Transaction.js
const mongoose = require("mongoose");
const format = require("date-fns");
const moment = require("moment-timezone");
const moments = require("moment");
const Schema = mongoose.Schema;

const transactionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacher_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_id: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    sub_category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category.subcategories" },
    transaction_id: {
      type: String,
      required: true,
    },
    payment_id: {
      type: Schema.Types.ObjectId,
      ref: "TeacherPayment",
    },
    amount: {
      type: Number,
    },
    datetime: {
      type: String,
      default: () => moment().tz("Asia/Kolkata").format("YYYY-MMM-DD hh:mm:ss A"),
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
