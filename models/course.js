const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    course_image: {
      type: String,
    },
    category_id: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: "Category.subcategories", required: true },
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
      required: true,
    },
    endDate: {
      type: String,
      required: true,
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
          return v.length <= 3;
        },
        message: "Course cannot have more than 3 users",
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
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
