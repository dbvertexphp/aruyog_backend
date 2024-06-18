import express from "express";
import { registerUser } from "../controllers/userController.js"; // Ensure the path and extension are correct

const UserRouter = express.Router();

UserRouter.post("/register_User", registerUser);

export default UserRouter;
