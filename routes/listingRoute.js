import express from "express";
import {
  createListing,
  getAllListings,
} from "../controllers/listingController.js";
import { isAuth } from "../middlewares/isAuthorized.js";
const router = express.Router();

router.post("/create", createListing);

router.get("/all", isAuth, getAllListings);

export default router;
