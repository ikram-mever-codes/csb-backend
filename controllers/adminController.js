import User from "../models/userModel.js";
import Token from "../models/tokenModel.js";
import Subscription from "../models/subscriptionModel.js";
import errorHandler from "../utils/errorHandler.js";
import Invoice from "../models/invoiceModel.js";

export const getAllUsers = async (req, res, next) => {
  try {
    let users = await User.find({ isVerified: true }).select("-password");

    if (users.length === 0) {
      return next(new errorHandler("No Users Found!", 404));
    }

    users = users.reverse();

    return res.status(200).json({
      users,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSingleUserDetails = async (req, res, next) => {
  try {
    let { id } = req.params;
    let user = await User.findById(id);
    if (!user) {
      return next(new errorHandler("User Not Found!", 404));
    }
    let subscription = await Subscription.findOne({ userId: id });

    let apiTokens = await Token.find({ userId: id });
    let transactions = await Invoice.find({ "customer.email": user.email });
    transactions = transactions.reverse();
    return res.status(200).json({
      user: { subscription, user, apiTokens, transactions },
    });
  } catch (error) {
    return next(error);
  }
};
export const deleteUserAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User Not Found!" });
    }

    const subscription = await Subscription.findOne({ userId: id });
    if (subscription) {
      await Token.deleteMany({ userId: id });
      await Subscription.deleteOne({ userId: id });
    }

    await User.findByIdAndDelete(id);

    return res
      .status(200)
      .json({ message: "User Account Deleted Successfully!" });
  } catch (error) {
    return next(error);
  }
};

export const changeMembershipType = async (req, res, next) => {
  try {
    let { userId, plan } = req.body;
    if (!userId || !plan) {
      return next(new errorHandler("Incomplete Fields!", 400));
    }
    let user = await User.findById(userId);
    if (!user || !user.isVerified) {
      return next(new errorHandler("User Not Found!", 404));
    }
    let subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      return next(new errorHandler("Subscription Not Found!", 404));
    }
    if (subscription.plan === plan) {
      return next(
        new errorHandler(`User Subscription Plan is Already ${plan}`, 400)
      );
    }
    subscription.plan = plan;
    user.subscription.plan = plan;
    await user.save();
    await subscription.save();
    return res.status(200).json({
      message: "User Subscription Type Changed Successfully!",
      status: 400,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUsersCount = async (req, res, next) => {
  try {
    let usersCount = await User.countDocuments({});
    return res.status(200).json({ usersCount });
  } catch (error) {
    return next(error);
  }
};
