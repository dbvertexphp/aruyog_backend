const mongoose = require("mongoose");
const moment = require("moment-timezone");

const bankDetailsSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  bankAddress: { type: String, required: true },
  teacherName: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  datetime: {
    type: String,
    default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
  },
});

const BankDetails = mongoose.model("BankDetails", bankDetailsSchema);

module.exports = BankDetails;
