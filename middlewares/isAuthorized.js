import errorHandler from "../utils/errorHandler.js";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { getAuth } from "@clerk/express";

export const isAuth = async (req, res, next) => {
  const token = req.cookies.token;
  const clerkSessionId = req.cookies.__session;

  try {
    // First check if the JWT token is available
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(
          new errorHandler("Invalid Token! Please Login Again.", 401)
        );
      }

      if (!user.isVerified) {
        return next(
          new errorHandler("Invalid Token! Please Login Again.", 401)
        );
      }

      req.user = user; // Attach user to the request object
      return next(); // Proceed to the next middleware
    }

    // If JWT token is not available, check the Clerk session ID
    if (clerkSessionId) {
      const authData = await getAuth(req);

      if (!authData || !authData.sessionId) {
        return next(
          new errorHandler("Session Expired! Please Login Again.", 400)
        );
      }

      const userId = authData.userId;

      if (!userId) {
        return next(new errorHandler("Invalid Session! No userId found.", 401));
      }

      const userClerkResponse = await fetch(
        `https://api.clerk.dev/v1/users/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!userClerkResponse.ok) {
        const errorResponse = await userClerkResponse.json();
        return next(
          new errorHandler(`Clerk API error: ${errorResponse.message}`, 500)
        );
      }

      const userData = await userClerkResponse.json();
      const userEmail = userData.email_addresses[0]?.email_address;

      if (!userEmail) {
        return next(new errorHandler("Invalid Session! No Email Found.", 401));
      }

      const user = await User.findOne({ email: userEmail });

      if (!user) {
        return next(
          new errorHandler("Invalid Session! Please Login Again.", 401)
        );
      }

      req.user = user;
      return next();
    }

    // If neither token nor Clerk session ID are available
    return next(new errorHandler("Session Expired! Please Login Again.", 400));
  } catch (error) {
    return next(error);
  }
};
