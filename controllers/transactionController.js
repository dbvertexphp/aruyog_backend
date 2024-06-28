// controllers/transactionController.js
const asyncHandler = require("express-async-handler");
const Transaction = require("../models/transactionModel");

const addTransaction = asyncHandler(async (req, res) => {
  const { user_id, teacher_id, course_id, transaction_id } = req.body;

  if (!user_id || !teacher_id || !course_id || !transaction_id) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    const newTransaction = new Transaction({
      user_id,
      teacher_id,
      course_id,
      transaction_id,
    });

    const savedTransaction = await newTransaction.save();

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
    const transactions = await Transaction.find().populate({
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
