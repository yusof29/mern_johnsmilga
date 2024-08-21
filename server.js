import "express-async-errors";
import errorHandlerMiddleware from "./middleware/errorHandlerMiddleware.js";
import { authenticateUser } from "./middleware/authMiddleware.js";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import cloudinary from "cloudinary";

import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();

import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.resolve(__dirname, "./client/dist")));

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

import morgan from "morgan";
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Json middleware
app.use(express.json());
// CP middleware
app.use(cookieParser());

// Job Routes middleware
import jobRouter from "./routes/jobRouter.js";
app.use("/api/v1/jobs", authenticateUser, jobRouter);

// Auth Routes middleware
import authRouter from "./routes/authRouter.js";
app.use("/api/v1/auth", authRouter);

// User Routes middleware
import userRouter from "./routes/userRouter.js";
app.use("/api/v1/users", authenticateUser, userRouter);

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./client/dist", "index.html"));
});

// Not Found middleware
app.use("*", (req, res) => {
  res.status(404).json({ msg: "not found" });
});

// Error middleware
app.use(errorHandlerMiddleware);

// server
const port = process.env.PORT || 5100;

// connection
try {
  await mongoose.connect(process.env.MONGO_URL);
  app.listen(port, () => {
    console.log(`server running on PORT ${port}....`);
  });
} catch (error) {
  console.log(error);
  process.exit(1);
}
