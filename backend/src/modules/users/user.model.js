import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    role: {
      type: String,
      enum: ["vendor"],
      required: true
    },

    businessName: {
      type: String,
      required: true,
      trim: true
    },

    industry: {
      type: String,
      required: true,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    savedCreators: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Creator' }
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
