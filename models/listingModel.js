import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type:String,
      required:true,

      enum: ["facebook", "wordpress"]
    },

    from: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    make: {
      type: String,
      trim: true,
    },
    mode: {
      type: String,
      trim: true,
    },
    year: {
      type: String,
    },
    vin: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;
