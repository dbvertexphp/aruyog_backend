const express = require("express");
const { addTransaction, getAllTransactions, getTransactionsByUserId } = require("../controllers/transactionController.js");
const protect = require("../middleware/authMiddleware.js");

const transactionRoutes = express.Router();

transactionRoutes.route("/addTransaction").post(protect, addTransaction);
transactionRoutes.route("/getAllTransactions").get(protect, getAllTransactions);
transactionRoutes.route("/getTransactionsByUserId/:userId").get(protect, getTransactionsByUserId);

module.exports = { transactionRoutes };
