import express from "express";
import uploadSingleImage from "../config/multer.js";
import {
  login,
  logout,
  signUp,
  verifyAccount,
  refresh,
  editProfile,
  changePassword,
  resendCode,
  forgotPassword,
  resetPassword,
} from "../controllers/userController.js";
import { isAuth } from "../middlewares/isAuthorized.js";
const router = express.Router();

// >> User Routes

// Sign Up Router for Users

router.post("/sign-up", signUp);

// Resend Verification Code

router.put("/resend-code", resendCode);

// Account Verification Route for Users

router.post("/verify", verifyAccount);

// Login Route for Users

router.post("/login", login);

// >> Protected Routes for Users

// Logout Route for Users

router.get("/logout", isAuth, logout);

// Refresh Route for User Details

router.get("/refresh", refresh);

// Edit Profile Route for Users

router.put("/edit-profile", isAuth, uploadSingleImage, editProfile);

// User Route For Changing Account Password

router.put("/change-password", isAuth, changePassword);

router.put("/forget-password", forgotPassword);
router.put("/reset-password", resetPassword);

export default router;
