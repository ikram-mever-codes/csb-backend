import express from "express";
import { getAllUsers } from "../controllers/adminController.js";
import isAdmin from "../middlewares/isAdmin.js";
import { isAuth } from "../middlewares/isAuthorized.js";

const router = express.Router();

router.get("/users", isAuth, isAdmin, getAllUsers);

export default router;
