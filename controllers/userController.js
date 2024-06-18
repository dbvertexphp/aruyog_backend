import User from "../models/usermodel.js";
import { createConnectyCubeUser } from "../utils/connectyCubeUtils.js";
import ErrorHandler from "../utils/errorHandler.js";

export const registerUser = async (req, res) => {
  const { full_name, mobile, password, email, role } = req.body;

  if (!full_name || !mobile || !password || !email) {
    return res.status(400).json({
      message: "Please enter all the required fields.",
      status: false,
    });
  }
  if (mobile.toString().length < 10) {
    return res.status(400).json({
      message: "Mobile number must be at least 10 digits long.",
      status: false,
    });
  }

  try {
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      throw new ErrorHandler(400, "User with this mobile number already exists.");
    }

    const otp = generateOTP();
    const { token, id } = await createConnectyCubeUser(mobile, password, email, full_name, role);

    const newUser = await User.create({
      full_name,
      mobile,
      password,
      otp,
      ConnectyCube_token: token,
      ConnectyCube_id: id,
    });

    if (newUser) {
      return res.status(201).json({
        _id: newUser._id,
        full_name: newUser.full_name,
        mobile: newUser.mobile,
        pic: newUser.pic,
        otp_verified: newUser.otp_verified,
        Connecty_Cube_token: newUser.ConnectyCube_token,
        Connecty_Cube_id: newUser.ConnectyCube_id,
        status: true,
      });
    } else {
      throw new ErrorHandler(500, "User registration failed.");
    }
  } catch (error) {
    console.error("Error:", error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error.";
    return res.status(statusCode).json({
      message,
      status: false,
    });
  }
};

async function getCBToken(mobile) {
  try {
    const userdata = await User.findOne({ mobile });
    if (userdata) {
      return { "CB-Token": userdata.ConnectyCube_token };
    } else {
      throw new ErrorHandler(404, "User not found");
    }
  } catch (error) {
    console.error("Error:", error);
    throw new ErrorHandler(500, "Internal server error");
  }
}

function generateOTP() {
  const min = 1000;
  const max = 9999;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}
