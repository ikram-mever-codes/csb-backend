import express from "express";
import {
  createToken,
  deleteToken,
  getAllTokens,
  postWpListing,
  verifyToken,
} from "../controllers/token.js";
import { isAuth } from "../middlewares/isAuthorized.js";

const router = express.Router();

router.post ("/create", isAuth, createToken);

router.delete("/:tokenId", isAuth, deleteToken);

router.post("/wp/create/listing", postWpListing);

router.get("/all", isAuth, getAllTokens);

router.get("/verify-token/:apiToken/:type", verifyToken);

export default router;
