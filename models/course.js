// models/Course.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category", // Assuming Category is another mongoose model
      required: true,
    },
    sub_category_id: {
      type: Schema.Types.ObjectId,
      ref: "Subcategory", // Assuming SubCategory is another mongoose model
      required: true,
    },
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
    teacher_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model (assuming teachers are users)
      required: true,
    },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
