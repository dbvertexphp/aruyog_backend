import ConnectyCube from "connectycube";
import dotenv from "dotenv";
import ErrorHandler from "../utils/errorHandler.js";

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

export async function createConnectyCubeUser(mobile, password, email, full_name, role) {
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
    console.error("Error creating ConnectyCube user:", error.info);
    throw new ErrorHandler(500, "ConnectyCube user creation failed");
  }
}
