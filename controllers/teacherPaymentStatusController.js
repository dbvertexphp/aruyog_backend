const asyncHandler = require("express-async-handler");
const TeacherPaymentStatus = require("../models/teacherPaymentStatusModel");
const { User } = require("../models/userModel");

const { startOfMonth, endOfMonth, subMonths, parse, format, isWithinInterval } = require("date-fns");

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

const calculatePayment = asyncHandler(async (req, res) => {
  try {
    const teacherId = req.headers.userID; // Ensure correct case for headers field (all lowercase).
    if (!teacherId) {
      return res.status(400).json({ error: "UserID header is required" });
    }

    const currentDate = new Date();
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);

    const payments = await TeacherPaymentStatus.find({ teacher_id: teacherId });

    const teacherInfo = await User.findById(teacherId);
    const fullName = teacherInfo ? teacherInfo.full_name : "Unknown";
    const profile_pic = teacherInfo ? teacherInfo.profile_pic : "Unknown";

    const totalAmount = payments.reduce((total, payment) => total + payment.amount, 0);

    // Calculate current month total
    const currentMonthPayments = payments.filter((payment) => isWithinInterval(parse(payment.payment_datetime, "dd/MM/yyyy", new Date()), { start: currentMonthStart, end: currentMonthEnd }));
    const currentMonthTotal = currentMonthPayments.reduce((total, payment) => total + payment.amount, 0);

    // Calculate previous months totals
    const previousMonthTotals = [];
    const distinctMonths = new Set();

    // Collect all distinct months from payments
    payments.forEach((payment) => {
      const paymentDate = parse(payment.payment_datetime, "dd/MM/yyyy", new Date());
      const monthKey = format(paymentDate, "MMMM yyyy");
      distinctMonths.add(monthKey);
    });

    // Iterate through each distinct month and calculate totals
    distinctMonths.forEach((monthKey) => {
      const monthDate = parse(`01 ${monthKey}`, "dd MMMM yyyy", new Date());
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthPayments = payments.filter((payment) => isWithinInterval(parse(payment.payment_datetime, "dd/MM/yyyy", new Date()), { start: monthStart, end: monthEnd }));
      const monthTotal = monthPayments.reduce((total, payment) => total + payment.amount, 0);

      previousMonthTotals.push({ month: monthKey, totalAmount: monthTotal });
    });

    res.json({
      totalAmount,
      currentMonthTotals: [{ month: format(currentMonthStart, "MMMM yyyy"), totalAmount: currentMonthTotal }],
      previousMonthTotals,
      fullName,
      profile_pic,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { addTeacherPaymentStatus, getTeacherPaymentStatuses, calculatePayment };
