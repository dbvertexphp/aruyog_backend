// controllers/transactionController.js
const asyncHandler = require("express-async-handler");
const Transaction = require("../models/transactionModel");
const Course = require("../models/course");
const baseURL = process.env.BASE_URL;

const addTransaction = asyncHandler(async (req, res) => {
  const user_id = req.headers.userID;
  const { teacher_id, course_id, transaction_id, amount, payment_id, payment_status } = req.body;

  if (!user_id || !teacher_id || !course_id || !transaction_id || !amount || !payment_id || !payment_status) {
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
      return res.status(400).json({
        message: `Maximum capacity (${maxUserIdsAllowed}) reached for this course`,
      });
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
