// controllers/transactionController.js
const asyncHandler = require("express-async-handler");
const Transaction = require("../models/transactionModel");
const Course = require("../models/course");

const addTransaction = asyncHandler(async (req, res) => {
  const user_id = req.headers.userID;
  const { teacher_id, course_id, transaction_id, amount } = req.body;

  if (!user_id || !teacher_id || !course_id || !transaction_id || !amount) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    const course = await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check the type of course to determine maximum userIds allowed
    const maxUserIdsAllowed = course.type === "group_course" ? 3 : 1;

    if (course.userIds.length >= maxUserIdsAllowed) {
      return res.status(400).json({ message: `Maximum capacity (${maxUserIdsAllowed}) reached for this course` });
    }

    const newTransaction = new Transaction({
      user_id,
      teacher_id,
      course_id,
      transaction_id,
      amount,
    });

    const savedTransaction = await newTransaction.save();

    // Update Course with userId if not already included
    if (!course.userIds.includes(user_id)) {
      course.userIds.push(user_id);
      await course.save();
    }

    res.status(201).json({
      message: "Transaction added successfully",
      transaction: savedTransaction,
    });
  } catch (error) {
    console.error("Error adding transaction:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getAllTransactions = asyncHandler(async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({
        path: "user_id",
        select: "first_name last_name email", // Specify fields you want to populate
      })
      .populate({
        path: "teacher_id",
        select: "name email",
      })
      .populate({
        path: "course_id",
        select: "title category_id type",
        populate: {
          path: "category_id",
          select: "name",
        },
      });

    res.status(200).json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getTransactionsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const transactions = await Transaction.find({ user_id: userId }).populate({
      path: "user_id teacher_id course_id payment_id",
      populate: {
        path: "payment_id",
        model: "TeacherPayment",
      },
    });

    res.status(200).json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = { addTransaction, getAllTransactions, getTransactionsByUserId };
