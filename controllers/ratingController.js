// controllers/ratingController.js

const asyncHandler = require("express-async-handler");
const Rating = require("../models/ratingModel.js");
const mongoose = require("mongoose");
const { User } = require("../models/userModel.js");

// Controller function to add a rating
const addRating = asyncHandler(async (req, res) => {
  const { teacher_id, rating, message } = req.body;
  const user_id = req.headers.userID; // Assuming user ID is obtained from authentication middleware

  try {
    // Check if the user has already rated the teacher
    const existingRating = await Rating.findOne({ teacher_id, user_id });

    if (existingRating) {
      return res.status(400).json({ message: "You have already rated this teacher." });
    }

    // If no existing rating found, create a new rating
    const newRating = await Rating.create({ teacher_id, user_id, rating, message });

    // Find the teacher to update their average rating
    const teacher = await User.findById(teacher_id);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Calculate the new average rating
    const totalRating = teacher.averageRating * teacher.ratingCount + rating;
    const newRatingCount = teacher.ratingCount + 1;
    const newAverageRating = totalRating / newRatingCount;

    // Update the teacher's average rating and rating count
    teacher.averageRating = newAverageRating;
    teacher.ratingCount = newRatingCount;
    await teacher.save();

    res.status(201).json({ rating: newRating, averageRating: newAverageRating });
  } catch (error) {
    console.error("Error adding rating:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getRatingsByTeacherId = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  try {
    const ratings = await Rating.aggregate([
      { $match: { teacher_id: mongoose.Types.ObjectId(teacherId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          ratings: {
            $push: {
              _id: "$_id",
              user_id: "$user_id",
              rating: "$rating",
              message: "$message",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
              __v: "$__v",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: 1,
          ratings: 1,
        },
      },
    ]);

    if (ratings.length === 0) {
      return res.status(404).json({ message: "No ratings found for the teacher." });
    }

    res.status(200).json({ ratings: ratings[0] });
  } catch (error) {
    console.error("Error fetching ratings:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = { addRating, getRatingsByTeacherId };
