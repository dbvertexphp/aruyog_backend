import express from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";
import UserRouter from "./routes/userRoute.js";
import { EventEmitter } from "events";

dotenv.config({ path: "./.env" });
const __dirname1 = path.resolve();

export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";

const app = express();
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: " * ", credentials: true }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname1, "")));

// Increase default max listeners to avoid warnings
EventEmitter.defaultMaxListeners = 15;

// --------------------- Routes -------------------------------
app.use("/api/user", UserRouter);
// --------------------- Routes -------------------------------

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/view")));
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "view", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// your routes here
app.get("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
  });
});

app.use(errorMiddleware);

const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}...`);
  console.log(`Base URL: ${BASE_URL}`);
});
