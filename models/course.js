const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");

const courseSchema = new Schema(
  {
    course_image: {
      type: String,
    },
    category_id: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: "Category.subcategories", required: true },
    deleted_at: { type: String, default: new Date() },
    type: {
      type: String,
      enum: ["group_course", "single_course"],
      required: true,
    },
    startTime: {
      type: String,
      required: function () {
        return this.type === "group_course"; // Required only if it's a group course
      },
    },
    endTime: {
      type: String,
      required: function () {
        return this.type === "group_course"; // Required only if it's a group course
      },
    },
    startDate: {
      type: String,
      default: null
    },
    endDate: {
      type: String,
      default: null
    },
    userIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      validate: {
        validator: function (v) {
          return v.length <= 4;
        },
        message: "Course cannot have more than 4 users",
      },
    },
    askDemoids: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    completeAskDemoids: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    askdemoid: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    meeting_id: {
      type: String,
      default: null,
    },
    call_id: {
      type: String,
      default: null,
    },
    start_meeting: {
      type: Boolean,
      default: false,
    },
    days: [
      {
        type: String,
        required: true,
      },
    ],

    teacher_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    payment_id: { type: Schema.Types.ObjectId, ref: "TeacherPayment", default: null },
    amount: { type: Number, default: null },
    payment_type: {
      // New field for payment type
      type: String,
      default: null
    },
    paymentDetailsUpdated: { type: Boolean, default: false } // New field
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
