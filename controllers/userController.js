import { StatusCodes } from "http-status-codes";
import User from "../models/UserModel.js";
import Job from "../models/JobModel.js";
import cloudinary from "cloudinary";
import { promises as fs } from "fs";

export const getCurrentUser = async (req, res) => {
  const user = await User.findOne({ _id: req.user.userId });
  const userWithoutPassword = user.toJSON();
  res.status(StatusCodes.OK).json({ user: userWithoutPassword });
};

export const getApplicationStats = async (req, res) => {
  const users = await User.countDocuments();
  const jobs = await Job.countDocuments();
  res.status(StatusCodes.OK).json({ users, jobs });
};

export const updateUser = async (req, res) => {
  const newUser = { ...req.body };
  delete newUser.password;

  // if we want to upload a photo
  if (req.file) {
    // then we upload that photo in cloudinary
    const response = await cloudinary.v2.uploader.upload(req.file.path);
    await fs.unlink(req.file.path);
    // then add/bind the photo's cloudinary url as a value to mongodb avatar field
    newUser.avatar = response.secure_url;
    // then add/bind the photo's cloudinary public_id as avalue to mongodb avatarPublicId field
    newUser.avatarPublicId = response.public_id;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.userId, newUser);

  // the updatedUser has the field of avatar and avatarPublicId
  // if we want to upload a photo and there is an existing photo with the id
  if (req.file && updatedUser.avatarPublicId) {
    // then we delete it using the avatarPublicId
    await cloudinary.v2.uploader.destroy(updatedUser.avatarPublicId);
  }

  res.status(StatusCodes.OK).json({ msg: "user updated" });
};
