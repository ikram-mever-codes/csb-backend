import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    apiToken: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["facebook", "wordpress"],
    },
    wordpressUrl: {
      type: String,
      required: function () {
        return this.type === "wordpress";
      },
    },
    wordpressVerified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Token = mongoose.model("Token", tokenSchema);

export default Token;
