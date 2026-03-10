import mongoose from "mongoose";

const promotionRequestSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Creator",
      required: true,
      index: true
    },

    campaignTitle: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true,
      maxlength: 1000
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true
    },

    proposedBudget: {
      type: Number,
      min: 0
    },

    contactEmail: {
      type: String,
      required: true,
      lowercase: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("PromotionRequest", promotionRequestSchema);
