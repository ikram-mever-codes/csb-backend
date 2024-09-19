import express from "express";
import {
  buySubscription,
  getAllInvoices,
} from "../controllers/subscriptionController.js";
import isAdmin from "../middlewares/isAdmin.js";
import { isAuth } from "../middlewares/isAuthorized.js";
const router = express.Router();

router.post("/buy", isAuth, buySubscription);

router.get("/invoices/all", isAuth, isAdmin, getAllInvoices);

export default router;
