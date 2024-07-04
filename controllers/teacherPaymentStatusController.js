const asyncHandler = require("express-async-handler");
const TeacherPaymentStatus = require("../models/teacherPaymentStatusModel");
const { User } = require("../models/userModel");

const addTeacherPaymentStatus = asyncHandler(async (req, res) => {
  const { teacher_id, amount, payment_datetime } = req.body;
  console.log(req.body);
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
    res.status(201).json({ savedPaymentStatus, status: true });
  } catch (error) {
    console.error("Error saving payment status:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getTeacherPaymentStatuses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query; // Default values: page 1, limit 10
  console.log(search);
  try {
    let query = {};

    // If search parameter is provided, filter by teacher's full_name
    if (search) {
      query = {
        // Assuming `teacher_id` is an ObjectId reference to another collection where `full_name` is stored
        teacher_id: { $in: await User.find({ full_name: { $regex: new RegExp(search, "i") } }).select("_id") },
      };
    }

    const paymentStatusesQuery = TeacherPaymentStatus.find(query)
      .populate({
        path: "teacher_id",
        select: "full_name",
      })
      .sort({ created_at: -1 }) // Sort by descending order of creation date
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const paymentStatuses = await paymentStatusesQuery.exec();
    const totalCount = await TeacherPaymentStatus.countDocuments(query);

    res.status(200).json({
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      paymentStatuses,
    });
  } catch (error) {
    console.error("Error fetching payment statuses:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = { addTeacherPaymentStatus, getTeacherPaymentStatuses };
