import express from "express";
import {
  changeMembershipType,
  deleteUserAccount,
  getAllUsers,
  getSingleUserDetails,
  getUsersCount,
} from "../controllers/adminController.js";
import isAdmin from "../middlewares/isAdmin.js";
import { isAuth } from "../middlewares/isAuthorized.js";

const router = express.Router();

router.get("/users", isAuth, isAdmin, getAllUsers);

router.get("/user-details/:id", isAuth, isAdmin, getSingleUserDetails);

router.delete("/user/:id", isAuth, isAdmin, deleteUserAccount);

router.put("/user/sub-type", isAuth, isAdmin, changeMembershipType);

router.get("/user/count", isAuth, isAdmin, getUsersCount);

export default router;
