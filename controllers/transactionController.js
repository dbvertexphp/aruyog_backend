// controllers/transactionController.js
const asyncHandler = require("express-async-handler");
const Transaction = require("../models/transactionModel");
const Course = require("../models/course");
const baseURL = process.env.BASE_URL;
const { User } = require("../models/userModel.js");
const { addNotification } = require("./teacherNotificationController");
const { sendFCMNotification } = require("./notificationControllers");
const { addDays, isWeekend, addMonths, getMonth, getDay } = require("date-fns");
const moment = require("moment-business-days");

const addTransaction = asyncHandler(async (req, res) => {
  const user_id = req.headers.userID;
  const { teacher_id, course_id, transaction_id, amount, payment_id, payment_status, newStartDate } = req.body;

  if (!user_id || !teacher_id || !course_id || !transaction_id || !amount || !payment_id || !payment_status || !newStartDate) {
    return res.status(400).json({ message: "Invalid input" });
  }
  try {
      // Validate and parse new startDate
    const parsedNewStartDate = new Date(newStartDate.replace(/\//g, "-")); // Replace "/" with "-" for correct parsing
    if (isNaN(parsedNewStartDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY/MM/DD." });
    }
    const course = await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Retrieve teacher's unavailable dates
    const teacherDate = await User.findById(teacher_id);
    if (!teacherDate) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    const teacherUnavailabilityDates = teacherDate.teacherUnavailabilityDates || [];

     // Calculate new end date excluding weekends
     const newEndDate = calculateEndDate(parsedNewStartDate, 21, teacherUnavailabilityDates); // Excluding weekends
     const formattedNewStartDate = formatDate(parsedNewStartDate);
     const formattedNewEndDate = formatDate(newEndDate);

     // Update course with new dates
     course.startDate = formattedNewStartDate;
     course.endDate = formattedNewEndDate;

     const updatedCourse = await course.save();

    // Check if the user has already purchased the course
    if (course.userIds.includes(user_id)) {
      return res.status(400).json({
        message: "You have already purchased this course",
        status: false,
      });
    }

    // Check the type of course to determine maximum userIds allowed
    const maxUserIdsAllowed = course.type === "group_course" ? 4 : 1;

    if (course.userIds.length >= maxUserIdsAllowed) {
      return res.status(400).json({
        message: `Maximum capacity (${maxUserIdsAllowed}) reached for this course`,
        status: false,
      });
    }

    const TransactionData = await Transaction.findOne({ payment_id: payment_id });
    if (TransactionData) {
      return res.status(404).json({ message: "Already Payment is done" });
    }

    const newTransaction = new Transaction({
      user_id,
      teacher_id,
      course_id,
      transaction_id,
      amount,
      payment_id,
      payment_status,
    });

    const savedTransaction = await newTransaction.save();

    // Update Course with userId if not already included
    if (!course.userIds.includes(user_id)) {
      course.userIds.push(user_id);
      await course.save();
    }

    // Send notification to teacher
    const teacher = await User.findById(teacher_id);

    if (teacher && teacher.firebase_token) {
      const registrationToken = teacher.firebase_token;
      const title = "New Course Purchase";
      const body = `A new transaction has been made for the course: ${course.title}.`;
      console.log(registrationToken);
      const notificationResult = await sendFCMNotification(registrationToken, title, body);
      if (notificationResult.success) {
        console.log("Notification sent successfully:", notificationResult.response);
      } else {
        console.error("Failed to send notification:", notificationResult.error);
      }
      await addNotification(user_id, teacher_id, body, title, amount);
    }
    // const adminUser = await User.findOne({ role: "admin" });

    // if (adminUser && adminUser.firebase_token) {
    //   const registrationToken = adminUser.firebase_token;
    //   const title = "New Course Purchase";
    //   const body = `A new transaction has been made for the course: ${course.title}.`;
    //   console.log(registrationToken);
    //   const notificationResult = await sendFCMNotification(registrationToken, title, body);
    //   if (notificationResult.success) {
    //     console.log("Notification sent successfully:", notificationResult.response);
    //   } else {
    //     console.error("Failed to send notification:", notificationResult.error);
    //   }
    // }

    // // Add notification to the admin's notification collection
    // if (adminUser) {
    //   await addNotification(user_id, adminUser._id, "New Transaction", course.title, amount);
    // }

    // Add notification to the teacher's notification collection


    res.status(201).json({
      message: "Transaction added successfully",
      transaction: savedTransaction,
    });
  } catch (error) {
    console.error("Error adding transaction:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Helper function to format date in YYYY/MM/DD format
function formatDate(date) {
      const d = new Date(date);
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const year = d.getFullYear();
      return `${year}/${month}/${day}`;
}
// Function to calculate end date excluding weekends and unavailable dates
const calculateEndDate = (startDate, daysToAdd, unavailableDates) => {
      console.log(unavailableDates);

      let currentDay = new Date(startDate);
      let count = 0;

      while (count < daysToAdd) {
        currentDay = addDays(currentDay, 1);

        const formattedDate = formatDate(currentDay);
        if (!isWeekend(currentDay) && !unavailableDates.includes(formattedDate)) {
          count++;
        }
      }

      return currentDay.toISOString().split("T")[0];
};
const getAllTransactions = asyncHandler(async (req, res) => {
  const { page = 1, search = "", Short = "" } = req.body;
  const perPage = 10; // You can adjust this according to your requirements

  // Build the query based on search (if any)
  const query = {
    $or: [
      { "user_id.first_name": { $regex: search, $options: "i" } },
      { "user_id.last_name": { $regex: search, $options: "i" } },
      { "user_id.email": { $regex: search, $options: "i" } },
      { "teacher_id.name": { $regex: search, $options: "i" } },
      { "teacher_id.email": { $regex: search, $options: "i" } },
      {
        "teacher_id.first_name": {
          $regex: search,
          $options: "i",
        },
      },
      { "teacher_id.last_name": { $regex: search, $options: "i" } },
      { "course_id.title": { $regex: search, $options: "i" } },
    ],
  };

  // Sorting based on Short field
  let sortCriteria = {};
  if (Short === "amount") {
    sortCriteria = { amount: -1 }; // Sort by amount in descending order
  } else {
    sortCriteria = { _id: -1 }; // Default sorting
  }

  try {
    const transactions = await Transaction.find()
      .populate({
        path: "user_id",
        select: "full_name email", // Specify fields you want to populate
      })
      .populate({
        path: "teacher_id",
        select: "name email full_name",
      })
      .populate({
        path: "course_id",
        select: "title category_id type",
        populate: {
          path: "category_id",
          select: "name",
        },
      })
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalCount = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    const paginationDetails = {
      current_page: parseInt(page),
      data: transactions,
      first_page_url: `${baseURL}api/transactions?page=1`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${baseURL}api/transactions?page=${totalPages}`,
      links: [
        {
          url: page > 1 ? `${baseURL}api/transactions?page=${page - 1}` : null,
          label: "&laquo; Previous",
          active: false,
        },
        {
          url: `${baseURL}api/transactions?page=${page}`,
          label: page.toString(),
          active: true,
        },
        {
          url: page < totalPages ? `${baseURL}api/transactions?page=${page + 1}` : null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      next_page_url: page < totalPages ? `${baseURL}api/transactions?page=${page + 1}` : null,
      path: `${baseURL}api/transactions`,
      per_page: perPage,
      prev_page_url: page > 1 ? `${baseURL}api/transactions?page=${page - 1}` : null,
      to: (page - 1) * perPage + transactions.length,
      total: totalCount,
    };

    res.json({
      Transactions: paginationDetails,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getAllTransactionsByUser = asyncHandler(async (req, res) => {
  const { page = 1, search = "", Short = "", user_id } = req.body;
  const perPage = 10; // You can adjust this according to your requirements
  // Build the query based on search (if any)
  const query = {
    $or: [
      { "user_id.first_name": { $regex: search, $options: "i" } },
      { "user_id.last_name": { $regex: search, $options: "i" } },
      { "user_id.email": { $regex: search, $options: "i" } },
      { "teacher_id.name": { $regex: search, $options: "i" } },
      { "teacher_id.email": { $regex: search, $options: "i" } },
      {
        "teacher_id.first_name": {
          $regex: search,
          $options: "i",
        },
      },
      { "teacher_id.last_name": { $regex: search, $options: "i" } },
      { "course_id.title": { $regex: search, $options: "i" } },
    ],
  };

  // Sorting based on Short field
  let sortCriteria = {};
  if (Short === "amount") {
    sortCriteria = { amount: -1 }; // Sort by amount in descending order
  } else {
    sortCriteria = { _id: -1 }; // Default sorting
  }

  try {
    const transactions = await Transaction.find({ user_id: user_id })
      .populate({
        path: "user_id",
        select: "first_name last_name email", // Specify fields you want to populate
      })
      .populate({
        path: "teacher_id",
        select: "name email first_name last_name",
      })
      .populate({
        path: "course_id",
        select: "title category_id type",
        populate: {
          path: "category_id",
          select: "name",
        },
      })
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalCount = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    const paginationDetails = {
      current_page: parseInt(page),
      data: transactions,
      first_page_url: `${baseURL}api/transactions?page=1`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${baseURL}api/transactions?page=${totalPages}`,
      links: [
        {
          url: page > 1 ? `${baseURL}api/transactions?page=${page - 1}` : null,
          label: "&laquo; Previous",
          active: false,
        },
        {
          url: `${baseURL}api/transactions?page=${page}`,
          label: page.toString(),
          active: true,
        },
        {
          url: page < totalPages ? `${baseURL}api/transactions?page=${page + 1}` : null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      next_page_url: page < totalPages ? `${baseURL}api/transactions?page=${page + 1}` : null,
      path: `${baseURL}api/transactions`,
      per_page: perPage,
      prev_page_url: page > 1 ? `${baseURL}api/transactions?page=${page - 1}` : null,
      to: (page - 1) * perPage + transactions.length,
      total: totalCount,
    };

    res.json({
      Transactions: paginationDetails,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getAllTransactionsByTeacher = asyncHandler(async (req, res) => {
  const { page = 1, search = "", Short = "", user_id } = req.body;
  const perPage = 10; // You can adjust this according to your requirements
  // Build the query based on search (if any)
  const query = {
    $or: [
      { "user_id.first_name": { $regex: search, $options: "i" } },
      { "user_id.last_name": { $regex: search, $options: "i" } },
      { "user_id.email": { $regex: search, $options: "i" } },
      { "teacher_id.name": { $regex: search, $options: "i" } },
      { "teacher_id.email": { $regex: search, $options: "i" } },
      {
        "teacher_id.first_name": {
          $regex: search,
          $options: "i",
        },
      },
      { "teacher_id.last_name": { $regex: search, $options: "i" } },
      { "course_id.title": { $regex: search, $options: "i" } },
    ],
  };

  // Sorting based on Short field
  let sortCriteria = {};
  if (Short === "amount") {
    sortCriteria = { amount: -1 }; // Sort by amount in descending order
  } else {
    sortCriteria = { _id: -1 }; // Default sorting
  }

  try {
    const transactions = await Transaction.find({ teacher_id: user_id })
      .populate({
        path: "user_id",
        select: "first_name last_name email", // Specify fields you want to populate
      })
      .populate({
        path: "teacher_id",
        select: "name email first_name last_name",
      })
      .populate({
        path: "course_id",
        select: "title category_id type",
        populate: {
          path: "category_id",
          select: "name",
        },
      })
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalCount = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    const paginationDetails = {
      current_page: parseInt(page),
      data: transactions,
      first_page_url: `${baseURL}api/transactions?page=1`,
      from: (page - 1) * perPage + 1,
      last_page: totalPages,
      last_page_url: `${baseURL}api/transactions?page=${totalPages}`,
      links: [
        {
          url: page > 1 ? `${baseURL}api/transactions?page=${page - 1}` : null,
          label: "&laquo; Previous",
          active: false,
        },
        {
          url: `${baseURL}api/transactions?page=${page}`,
          label: page.toString(),
          active: true,
        },
        {
          url: page < totalPages ? `${baseURL}api/transactions?page=${page + 1}` : null,
          label: "Next &raquo;",
          active: false,
        },
      ],
      next_page_url: page < totalPages ? `${baseURL}api/transactions?page=${page + 1}` : null,
      path: `${baseURL}api/transactions`,
      per_page: perPage,
      prev_page_url: page > 1 ? `${baseURL}api/transactions?page=${page - 1}` : null,
      to: (page - 1) * perPage + transactions.length,
      total: totalCount,
    };

    res.json({
      Transactions: paginationDetails,
      page: page.toString(),
      total_rows: totalCount,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = {
  addTransaction,
  getAllTransactions,
  getAllTransactionsByUser,
  getAllTransactionsByTeacher,
};
