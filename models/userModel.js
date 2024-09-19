import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, minlength: 3, maxlength: 25 },
    lastName: { type: String, required: true, maxlength: 30 },
    phoneNumber: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: "user", enum: ["user", "admin"] },
    subscription: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
      expiresAt: Date,
      plan: { type: String, enum: ["basic", "advance"] },
      status: {
        type: String,
        default: "inactive",
        enum: ["active", "inactive"],
      },
    },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationCodeExpiration: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
