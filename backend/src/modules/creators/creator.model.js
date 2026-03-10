import mongoose from "mongoose";

const creatorSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    niche: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },

    pricePerPost: {
      type: Number,
      required: true,
      min: 0,
    },

    platforms: {
      instagram: {
        username: String,
        followers: { type: Number, min: 0 },
        engagementRate: { type: Number, min: 0, max: 100 },
      },
      youtube: {
        channelName: String,
        subscribers: { type: Number, min: 0 },
        avgViews: { type: Number, min: 0 },
      },
    },

    /*
     * socialStats — raw social media statistics used as ML input features.
     * These are platform-agnostic numbers the creator provides during registration.
     * They map directly to the feature set expected by predict.py.
     *
     * Required for ML scoring:
     *   totalFollowers    → followers_count
     *   totalFollowing    → friends_count
     *   totalPosts        → statuses_count
     *   totalLikes        → favourites_count  (lifetime likes/reactions given)
     *   accountCreatedAt  → account_age_days (days from this date to now)
     *   isVerified        → verified
     *   hasProfileImage   → default_profile_image (inverted)
     *   hasDescription    → has_description
     *   hasUrl            → has_url
     *   screenName        → screen_name / name_length / digits_in_name
     */
    socialStats: {
      totalFollowers:   { type: Number, default: 0, min: 0 },
      totalFollowing:   { type: Number, default: 0, min: 0 },
      totalPosts:       { type: Number, default: 0, min: 0 },
      totalLikes:       { type: Number, default: 0, min: 0 },  // lifetime likes/reactions given by this account
      accountCreatedAt: { type: Date },          // When the social account was created
      isVerified:       { type: Boolean, default: false },
      hasProfileImage:  { type: Boolean, default: true },
      hasDescription:   { type: Boolean, default: true },
      hasUrl:           { type: Boolean, default: false },
      screenName:       { type: String, trim: true },
    },

    /* ML scoring output */
    authenticityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      index: true,
    },

    // Engagement authenticity tier returned by the ML module
    riskLevel: {
      type: String,
      enum: ["Authentic", "Suspicious", "Inauthentic", null],
      default: null,
    },

    // Full breakdown stored for transparency / audit trail
    mlDetails: {
      bot_probability: { type: Number },
      anomaly_score:   { type: Number },
      network_score:   { type: Number },
      scoredAt:        { type: Date },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* Fast search indexes */
creatorSchema.index({ niche: 1 });
creatorSchema.index({ country: 1 });
creatorSchema.index({ authenticityScore: -1 });
creatorSchema.index({ pricePerPost: 1 });

export default mongoose.model("Creator", creatorSchema);
