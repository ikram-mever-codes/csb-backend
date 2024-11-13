import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/database.js";
import stripe from "stripe";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import tokenRouter from "./routes/tokenRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import listingRouter from "./routes/listingRoute.js";
import cors from "cors";
import path from "path";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { clerkMiddleware } from "@clerk/express";

import Subscription from "./models/subscriptionModel.js";
import User from "./models/userModel.js";

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

dotenv.config();

const app = express();
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    callback(null, origin);
  },
  origin: ["*", "http://localhost:3000", "https://www.facebook.com"], // Allow all origins
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
  "Access-Control-Allow-Origin": "http://localhost:3000",
  credentials: true,
};

// Define your routes here
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/json" }));

app.use(
  clerkMiddleware(
    {
      apiKey: process.env.CLERK_API_KEY,
      domain: process.env.CLERK_FRONTEND_API,
    },
    { debug: true }
  )
);
const __uploads_dirname = path.resolve();

app.use("/pdfs", express.static(path.join(__uploads_dirname, "/pdfs")));
app.use("/uploads", express.static(path.join(__uploads_dirname, "/uploads")));

app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/token", tokenRouter);
app.use("/api/listing", listingRouter);

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const event = stripeClient.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    try {
      switch (event.type) {
        case "invoice.payment_succeeded":
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;
          const subscription = await Subscription.findOne({
            stripeSubscriptionId: subscriptionId,
          });
          if (subscription && subscription.isRecurring) {
            subscription.paymentStatus = "paid";
            subscription.endDate = new Date(invoice.period_end * 1000);
            await subscription.save();

            const user = await User.findById(subscription.userId);
            if (user) {
              user.subscription.expiresAt = subscription.endDate;
              user.subscription.status = "active";
              await user.save();
            }
          }
          break;

        case "invoice.payment_failed":
          const failedInvoice = event.data.object;
          const failedSubscriptionId = failedInvoice.subscription;
          const failedSubscription = await Subscription.findOne({
            stripeSubscriptionId: failedSubscriptionId,
          });
          if (failedSubscription && failedSubscription.isRecurring) {
            failedSubscription.paymentStatus = "failed";
            await failedSubscription.save();

            const user = await User.findById(failedSubscription.userId);
            if (user) {
              user.subscription.status = "inactive";
              await user.save();
            }
          }
          break;

        case "customer.subscription.deleted":
          const deletedSubscription = event.data.object;
          const deletedSubscriptionId = deletedSubscription.id;
          const subscriptionToDelete = await Subscription.findOne({
            stripeSubscriptionId: deletedSubscriptionId,
          });
          if (subscriptionToDelete && subscriptionToDelete.isRecurring) {
            subscriptionToDelete.status = "cancelled";
            await subscriptionToDelete.save();

            const user = await User.findById(subscriptionToDelete.userId);
            if (user) {
              user.subscription.status = "inactive";
              await user.save();
            }
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.status(200).send("Event received");
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// Error Middleware for Error Handling
app.use(errorMiddleware);

// Endpoint to Fetch Image and Convert to Buffer
app.get("/fetch-image", async (req, res) => {
  const imageUrl = req.query.url;
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    res.set("Content-Type", "image/png");
    return res.send(buffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).send("Error fetching image");
  }
});

// 404 Not Found handler
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Resource Not Found!",
  });
});

// Connecting Database
connectDb();

// Uncaught Exception Handling
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

let PORT = process.env.PORT || 7000;

const server = app.listen(PORT, () => {
  console.log(`Server is Running on PORT:${PORT}`);
});
