const asyncHandler = require("express-async-handler");
const TeacherPaymentStatus = require("../models/teacherPaymentStatusModel");

const addTeacherPaymentStatus = asyncHandler(async (req, res) => {
  const { teacher_id, amount, payment_datetime } = req.body;

  // Validate input data
  if (!teacher_id || !amount || !payment_datetime) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Create a new TeacherPaymentStatus document
    const newPaymentStatus = new TeacherPaymentStatus({
      teacher_id,
      amount,
      payment_datetime,
    });

    // Save the document to the database
    const savedPaymentStatus = await newPaymentStatus.save();

    // Respond with the saved document
    res.status(201).json(savedPaymentStatus);
  } catch (error) {
    console.error("Error saving payment status:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = { addTeacherPaymentStatus };
