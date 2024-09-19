import errorHandler from "../utils/errorHandler.js";

const isAdmin = (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return next(
        new errorHandler("Session not Found! Please login Again.", 400)
      );
    }

    if (req.user.role !== "admin") {
      return next(
        new errorHandler("You are not allowed to access this resource", 403)
      );
    }

    next();
  } catch (error) {
    return next(error);
  }
};

export default isAdmin;
