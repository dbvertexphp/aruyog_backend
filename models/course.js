// models/Course.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    category_id: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: "Category.subcategories", required: true },
    type: {
      type: String,
      enum: ["group_course", "single_course"],
      required: true,
    },
    startTime: {
      type: Date,
      required: function () {
        return this.type === "group_course"; // Required only if it's a group course
      },
    },
    endTime: {
      type: Date,
      required: function () {
        return this.type === "group_course"; // Required only if it's a group course
      },
    },
    teacher_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
