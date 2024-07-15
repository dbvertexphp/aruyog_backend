const ConnectyCube = require("connectycube");
const dotenv = require("dotenv");
const ErrorHandler = require("../utils/errorHandler.js");

dotenv.config();

const CREDENTIALS = {
  appId: process.env.CAPPID,
  authKey: process.env.AUTHKEY,
  authSecret: process.env.AUTHSECRET,
};

if (!CREDENTIALS.appId || !CREDENTIALS.authKey || !CREDENTIALS.authSecret) {
  throw new Error("ConnectyCube credentials are not set correctly");
}

ConnectyCube.init(CREDENTIALS);

async function createConnectyCubeUser(mobile, password, email, full_name, role) {
  try {
    const session = await ConnectyCube.createSession();
    const userProfile = {
      login: mobile,
      password,
      email,
      full_name,
      phone: mobile,
      tag_list: [role],
      token: session.token,
    };
    const user = await ConnectyCube.users.signup(userProfile);
    return {
      token: session.token,
      id: user.user.id,
    };
  } catch (error) {
    if (error.info && error.info.errors && error.info.errors.base && error.info.errors.base.includes("email must be unique")) {
      throw new ErrorHandler("Email already exists", 400);
    } else {
      throw new ErrorHandler("ConnectyCube user creation failed", 500);
    }
  }
}

// const adminCredentials = {
//   login: "aruyog007@gmail.com", // Replace with your admin email
//   password: "ARU@yog#007", // Replace with your admin password
// };

// async function updatePassword(userToUpdate) {
//   console.log(userToUpdate);
//   try {
//     // Create a session with admin credentials (assuming admin has permission to update passwords)
//     const session = await ConnectyCube.createSession(adminCredentials);
//     console.log("Admin session created:", session);

//     // Update the user's password on ConnectyCube server
//     const updateResult = await ConnectyCube.users.update(userToUpdate);
//     console.log("Password update result on ConnectyCube:", updateResult);
//   } catch (error) {
//     console.error("Error updating password on ConnectyCube:", error);
//   }
// }

module.exports = {
  createConnectyCubeUser,
};
