import errorHandler from "../utils/errorHandler.js";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

export const isAuth = async (req, res, next) => {
  let token = req.cookies.token;
  if (!token) {
    return next(new errorHandler("Session Expired! Please Login Again.", 400));
  }
  try {
    let decoded = await jwt.verify(token, process.env.JWT_SECRET);

    let user = await User.findById(decoded.id);

    if (!user) {
      return next(new errorHandler("Invalid Token! Please Login Again.", 401));
    }
    if (user && !user.isVerified) {
      return next(new errorHandler("Invalid Token! Please Login Again.", 401));
    }

    req.user = user;

    next();
  } catch (error) {
    return next(error);
  }
};
