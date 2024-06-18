import express from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: "./.env" });
const __dirname1 = path.resolve();

export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: " * ", credentials: true }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname1, "")));

// --------------------- Routes -------------------------------

if (process.env.NODE_ENV == "production") {
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
