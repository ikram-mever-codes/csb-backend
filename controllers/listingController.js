import Listing from "../models/listingModel.js";
import User from "../models/userModel.js";
import errorHandler from "../utils/errorHandler.js";
export const createListing = async (req, res, next) => {
  try {
    let body = req.body;
    if (
      !body.type ||
      !body.userId ||
      !body.from ||
      !body.price ||
      !body.platform ||
      !body.title
    ) {
      return res.status(400).json({
        success: false,
        message: "Incomplete Fields",
      });
    }
    let user = await User.findById(body.userId);
    let currentDate = new Date();
    if (
      !user.subscription.expiresAt ||
      currentDate > new Date(user.subscription.expiresAt)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unable to Post Listing. Subscription Expired!",
      });
    }

    let listing = await Listing({
      ...body,
    });
    await listing.save();
    return res.status(201).json({
      success: true,
      message: "Listing Created Successfully!",
      listing,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAllListings = async (req, res, next) => {
  try {
    let listings = await Listing.find({ userId: req.user._id });

    if (listings.length === 0) {
      return next(new errorHandler("No Listings Found!", 404));
    }

    listings = listings.reverse();

    return res.status(200).json({
      listings,
    });
  } catch (error) {
    return next(error);
  }
};
