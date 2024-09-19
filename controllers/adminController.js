import User from "../models/userModel.js";
import sendEmail from "../services/emailService.js";
import errorHandler from "../utils/errorHandler.js";
import generateCode from "../utils/generateCode.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import dotenv from "dotenv";

export const getAllUsers = async (req, res, next) => {
  try {
    let users = await User.find({ isVerified: true }).select("-password");

    if (users.length === 0) {
      return next(new errorHandler("No Users Found!", 404));
    }

    users = users.reverse();

    return res.status(200).json({
      users,
    });
  } catch (error) {
    return next(error);
  }
};
