import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import moment from "moment-timezone";

const baseURL = process.env.BASE_URL;

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String },
  mobile: { type: Number, unique: true },
  password: { type: String, required: true },
  otp: { type: String },
  otp_verified: { type: Number, default: 0 },
  pic: {
    type: String,
    required: true,
    default: "uploads/Profile/default_pic.jpg",
  },
  deleted_at: { type: Date, default: null },
  role: { type: String, default: null },
  datetime: {
    type: String,
    default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
  },
  ConnectyCube_token: { type: String },
  fairbase_token: { type: String, default: null },
  ConnectyCube_id: { type: Number },
});

userSchema.post("findOne", function (doc) {
  if (doc) {
    doc.pic = baseURL + doc.pic;
  }
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
