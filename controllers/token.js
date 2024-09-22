import Subscription from "../models/subscriptionModel.js";
import Token from "../models/tokenModel.js";
import User from "../models/userModel.js";
import errorHandler from "../utils/errorHandler.js";
import crypto from "crypto";
import fetch from "node-fetch";
export const createToken = async (req, res, next) => {
  try {
    const { type, wordpressUrl } = req.body;
    const subscriptionId = req.user?.subscription?.id;

    const validWordpressUrlRegex =
      /^(https?:\/\/)?([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)$/;

    if (!subscriptionId) {
      return next(new errorHandler("Please subscribe to a membership!", 400));
    }

    if (!type || (type === "wordpress" && !wordpressUrl)) {
      return next(
        new errorHandler(
          "Incomplete credentials! WordPress URL is required for WordPress type.",
          400
        )
      );
    }

    if (type === "wordpress" && !validWordpressUrlRegex.test(wordpressUrl)) {
      return next(
        new errorHandler(
          "Invalid WordPress URL! Please provide a valid domain (e.g., https://example.com) without any additional path.",
          400
        )
      );
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new errorHandler("User not found!", 404));
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return next(new errorHandler("Subscription not found!", 404));
    }

    if (
      subscription.userId.toString() !== user._id.toString() ||
      user.subscription.id.toString() !== subscriptionId.toString()
    ) {
      return next(new errorHandler("Invalid subscription!", 400));
    }

    const tokens = await Token.find({ userId: req.user._id });
    if (subscription.plan === "standard" && tokens.length >= 2) {
      return next(
        new errorHandler(
          "Only two tokens are allowed on the standard plan!",
          400
        )
      );
    }

    if (subscription.plan === "advance" && tokens.length >= 3) {
      return next(new errorHandler("API token limit reached!", 400));
    }

    // WordPress type requires 'advance' plan
    if (type === "wordpress" && subscription.plan !== "advance") {
      return next(
        new errorHandler(
          "You need a premium plan for WordPress automation.",
          400
        )
      );
    }

    const apiToken = crypto.randomUUID();

    const token = new Token({
      userId: user._id,
      subscriptionId,
      apiToken,
      type,
      expiresAt: subscription.endDate,
    });

    if (type === "wordpress") {
      try {
        const response = await fetch(
          `${wordpressUrl}/wp-json/csb/v1/verify-plugin`
        );

        if (!response.ok) {
          return next(
            new errorHandler(
              "Failed to verify CSB plugin on the given WordPress website.",
              400
            )
          );
        }

        const responseBody = await response.json();

        if (responseBody.wp_verification) {
          token.wordpressUrl = wordpressUrl;
          token.wordpressVerified = true;
        } else {
          return next(
            new errorHandler(
              "Verification failed: plugin not installed or not active.",
              400
            )
          );
        }
      } catch (fetchError) {
        return next(new errorHandler("Error verifying WordPress plugin.", 500));
      }
    }

    await token.save();

    return res
      .status(201)
      .json({ message: "API token created successfully!", token });
  } catch (error) {
    return next(error);
  }
};

export const getAllTokens = async (req, res, next) => {
  try {
    let tokens = await Token.find({ userId: req.user._id });
    if (tokens.length === 0) {
      return next(new errorHandler("No Tokens Found!", 404));
    }
    return res.status(200).json({ tokens });
  } catch (error) {
    return next(error);
  }
};
export const deleteToken = async (req, res, next) => {
  try {
    let { tokenId } = req.params;
    if (!tokenId) {
      return next(new errorHandler("Token Id is required!", 400));
    }
    let token = await Token.findOne({ _id: tokenId, userId: req.user._id });
    if (!token) {
      return next(new errorHandler("Token Not Found!", 400));
    }

    await Token.findByIdAndDelete(token._id);

    return res.status(200).json({ message: "Token Deleted Successfully!" });
  } catch (error) {
    return next(error);
  }
};

export const verifyToken = async (req, res, next) => {
  try {
    let { apiToken, type } = req.params;
    let token = await Token.findOne({ apiToken });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Invalid Token! Please Try Again.",
      });
    }
    if (token.type !== type) {
      return res.status(400).json({
        success: false,
        message: `The Api Token does not have Type: ${type}! Please create a token with this type.`,
      });
    }

    let subscription = await Subscription.findOne({
      _id: token.subscriptionId,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No subscription found for this token.",
      });
    }

    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return res.status(403).json({
        success: false,
        message: "Subscription has expired. Please renew it.",
        userId: token.userId,
      });
    }

    return res.status(200).json({
      success: true,
      userId: token.userId,
      message: "Api Token Verified Successfully!",
      ...(type === "wordpress" && { wpUrl: token.wordpressUrl }),
    });
  } catch (error) {
    return next(error);
  }
};

// export const postWpListing = async (req, res, next) => {
//   try {
//     const body = req.body;

//     if (
//       !body.title ||
//       !body.make ||
//       !body.model ||
//       !body.year ||
//       !body.description ||
//       !body.gallery ||
//       !!body.token
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Incomplete Info! Please make sure all important infromation is scraped",
//       });
//     }
//     let token = await Token.findOne({ apiToken: body.token });
//     if (token.type !== "wordpress") {
//       return res.status(400).json({
//         message: "Invalid Token",
//         success: false,
//       });
//     }

//     const response = await fetch(
//       `${token.wordpressUrl}/wordpress/wp-json/csb/v1/create-listing`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(body),
//       }
//     );
//     const data = await response.json();
//     console.log(data);
//     if (!data.success) {
//       return res.status(400).json({
//         sucess: false,
//         message: data.message || "Unexpected Error",
//       });
//     }
//     return res.status(201).json({
//       success: true,
//       message: "Listing Posted to WordPress Successfully!",
//     });
//   } catch (error) {
//     return next(error);
//   }
// };
