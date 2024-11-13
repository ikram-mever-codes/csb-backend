import User from "../models/userModel.js";
import sendEmail from "../services/emailService.js";
import errorHandler from "../utils/errorHandler.js";
import generateCode from "../utils/generateCode.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import dotenv from "dotenv";
import { getAuth } from "@clerk/express";
import crypto from "crypto";

dotenv.config();

// Sign Up Controller for Users

export const signUp = async (req, res, next) => {
  let { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return next(new errorHandler("All the Fields are Required!", 400));
  }
  try {
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return next(new errorHandler("Invalid Email! Please Try Again.", 401));
    }
    let verificationData = generateCode();
    let hashedPassword = await bcryptjs.hash(password, 10);
    let hashedCode = await bcryptjs.hash(verificationData.code.toString(), 10);
    if (user && !user.isVerified) {
      user.firstName = firstName;
      user.lastName = lastName;
      user.email = email;
      user.password = hashedPassword;
      user.verificationCode = hashedCode;
      user.verificationCodeExpiration = verificationData.expiresAt;
    } else {
      user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        verificationCode: hashedCode,
        verificationCodeExpiration: verificationData.expiresAt,
      });
    }
    await user.save();

    const emailOptions = {
      from: "CSB <no-reply@carsalesboost.com>",
      to: email,
      subject: "Verification Code for CSB Account",
      html: `<div>
      Verification Code for Verifying you CSB Account: <strong>${verificationData.code}</strong>
      </div>`,
    };

    await sendEmail(emailOptions);

    return res.status(201).json({
      message: `Verification Code Sent to ${email}`,
      codeExpirey: user.verificationCodeExpiration,
    });
  } catch (error) {
    return next(error);
  }
};

export const resendCode = async (req, res, next) => {
  try {
    let { email } = req.body;
    if (!email) {
      return next(new errorHandler("Email is Required!", 400));
    }
    let user = await User.findOne({ email });
    if (!user) {
      return next(new errorHandler("Accout not Found!", 404));
    }
    if (user && user.isVerified) {
      return next(new errorHandler("Invalid Email! Please Try Again.", 401));
    }
    let verificationData = generateCode();
    let hashedCode = await bcryptjs.hash(verificationData.code.toString(), 10);
    if (user && !user.isVerified) {
      user.email = email;
      user.verificationCode = hashedCode;
      user.verificationCodeExpiration = verificationData.expiresAt;
    }
    await user.save();

    const emailOptions = {
      from: "CSB <no-reply@carsalesboost.com>",
      to: email,
      subject: "Verification Code for CSB Account",
      html: `<div>
      Verification Code for Verifying you CSB Account: <strong>${verificationData.code}</strong>
      </div>`,
    };

    await sendEmail(emailOptions);

    return res.status(201).json({
      message: `Verification Code Re Sent to ${email}`,
      codeExpirey: user.verificationCodeExpiration,
    });
  } catch (error) {
    return next(error);
  }
};

// Controller to Verify User Account

export const verifyAccount = async (req, res, next) => {
  let { verificationCode, email } = req.body;

  if (!verificationCode || !email) {
    return next(
      new errorHandler("Verification Failed! Incomplete Credentials.", 400)
    );
  }
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return next(new errorHandler("Email Not Found! Please Try Again", 401));
    }
    if (user && user.isVerified) {
      return next(
        new errorHandler("Verification Failed: Account Already Verified", 401)
      );
    }

    if (!user.verificationCodeExpiration || !user.verificationCodeExpiration) {
      return next(
        new errorHandler("Verification Failed! Please Try Again.", 401)
      );
    }

    let currentTime = new Date();

    if (currentTime > user.verificationCodeExpiration) {
      return next(
        new errorHandler("Verification Code Expired! Try Again.", 401)
      );
    }

    let codeMatch = await bcryptjs.compare(
      verificationCode,
      user.verificationCode
    );

    if (!codeMatch) {
      return next(new errorHandler("Incorrect Code! Please Try Again.", 400));
    }

    user.verificationCode = undefined;
    user.verificationCodeExpiration = undefined;
    user.isVerified = true;
    await user.save();
    // Generate JWT token
    let token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "your_jwt_secret",

      { expiresIn: "7d" }
    );

    return res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: "Verification Successful!" });
  } catch (error) {
    return next(error);
  }
};

// Login Controller for Users

export const login = async (req, res, next) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return next(new errorHandler("Please fill all the Credentials!", 400));
  }
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return next(new errorHandler("Invalid Email! Please Try Again.", 401));
    }
    if (user && !user.isVerified) {
      return next(new errorHandler("Invalid Email! Please Try Again.", 401));
    }
    let passwordMatch = await bcryptjs.compare(password, user.password || "");
    if (!passwordMatch) {
      return next(
        new errorHandler("Incorrect Password! Please Try Again.", 401)
      );
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "", {
      expiresIn: "7d",
    });

    return res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: `Welcome Back ${user.firstName}!`,
        user,
      });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

// Logout Controller for Users
export const logout = (req, res, next) => {
  try {
    return res
      .status(200)
      .clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })
      .clearCookie("__clerk_db_jwt", {
        httpOnly: true,
        secure: false,
        sameSite: "none",
      })
      .clearCookie("__session", {
        httpOnly: true,
        secure: false,
        sameSite: "none",
      })
      .json({
        message: "User Logged Out!",
      });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  const token = req.cookies.token;
  const clerkSessionId = req.cookies.__session;

  try {
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

      // Refresh the JWT cookie
      return res
        .status(200)
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({ user });
    }

    // If the token is not present, fall back to the Clerk session
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

      const userClerk = await fetch(
        `https://api.clerk.dev/v1/users/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!userClerk.ok) {
        const errorResponse = await userClerk.json();
        return next(
          new errorHandler(`Clerk API error: ${errorResponse.message}`, 500)
        );
      }

      const userData = await userClerk.json();
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

      // Optionally, create a new token for the user if needed
      const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res
        .status(200)
        .cookie("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .json({ user });
    }

    // If neither token nor Clerk session ID are available
    return next(new errorHandler("Session Expired! Please Login Again.", 400));
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

// User Controller for Editing Profile

export const editProfile = async (req, res, next) => {
  let { firstName, lastName } = req.body;
  try {
    let user = await User.findById(req.user._id);
    if (req.file) {
      await cloudinary.v2.uploader.upload(
        req.file.path,
        function (error, result) {
          user.avatar = result.secure_url;
        }
      );
    }
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;

    await user.save();

    return res.status(200).json({
      message: "Profile Updated",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

/// User Controller For Changing Account Password

export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return next(new errorHandler("All fields are required!", 400));
  }

  if (newPassword !== confirmNewPassword) {
    return next(new errorHandler("New passwords do not match", 400));
  }

  if (currentPassword === newPassword) {
    return next(
      new errorHandler("Current and New Password Can't be same", 400)
    );
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new errorHandler("User not found!", 404));
    }

    const passwordMatch = await bcryptjs.compare(
      currentPassword,
      user.password
    );
    if (!passwordMatch) {
      return next(new errorHandler("Incorrect current password!", 401));
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new errorHandler("Email is required!", 400));
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return next(
        new errorHandler("User with this email does not exist!", 404)
      );
    }

    const forgetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = forgetToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${forgetToken}`;

    const emailOptions = {
      from: "CSB <no-reply@carsalesboost.com>",
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetUrl}" target="_blank">Reset Password</a>
             <p>If you did not request this, please ignore this email.</p>`,
    };

    await sendEmail(emailOptions);

    return res.status(200).json({
      message: `Password reset link sent to ${email}`,
    });
  } catch (error) {
    console.log(error);
  }
};

export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return next(new errorHandler("Token and new password are required!", 400));
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new errorHandler("Invalid or expired reset token!", 400));
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({
      message: "Password has been successfully reset.",
    });
  } catch (error) {
    return next(error);
  }
};
