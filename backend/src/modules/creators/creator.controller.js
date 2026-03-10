import Creator from "./creator.model.js";
import { getAuthenticityScore } from "../../services/ml.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Create creator profile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/creators
 *
 * Creates the creator's profile, then fires the ML scoring pipeline in the
 * background (fire-and-forget) so the API response is not delayed.
 * The score will be available on the next GET /api/creators/:id call.
 *
 * Body: {
 *   name, niche, country, pricePerPost,
 *   platforms: { instagram: {...}, youtube: {...} },
 *   socialStats: {
 *     totalFollowers, totalFollowing, totalPosts,
 *     accountCreatedAt, isVerified, hasProfileImage,
 *     hasDescription, hasUrl, screenName
 *   }
 * }
 */
export const createCreatorProfile = async (req, res, next) => {
  try {
    const { uid, email } = req.user;

    const existing = await Creator.findOne({ uid });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Creator profile already exists",
      });
    }

    const creator = await Creator.create({
      uid,
      email,
      ...req.body,
    });

    // ── Fire ML scoring in the background ─────────────────────────────────
    // Do NOT await — return the profile immediately so the client is not blocked.
    // The score will be written to MongoDB once predict.py completes.
    getAuthenticityScore(creator).catch((err) => {
      console.error(
        `[mlService] Background scoring failed for creator ${creator._id}:`,
        err.message
      );
    });

    res.status(201).json({
      success: true,
      message:
        "Profile created. Authenticity score is being calculated and will be available shortly.",
      data: creator,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get all creators (with filters + pagination)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/creators
 * Query: page, limit, niche, country, minPrice, maxPrice, minScore
 */
export const getAllCreators = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      niche,
      country,
      minPrice,
      maxPrice,
      minScore,
    } = req.query;

    const query = {};

    if (niche)    query.niche    = niche;
    if (country)  query.country  = country;
    if (minScore) query.authenticityScore = { $gte: Number(minScore) };

    if (minPrice || maxPrice) {
      query.pricePerPost = {};
      if (minPrice) query.pricePerPost.$gte = Number(minPrice);
      if (maxPrice) query.pricePerPost.$lte = Number(maxPrice);
    }

    const [creators, total] = await Promise.all([
      Creator.find(query)
        .select("-mlDetails -socialStats")   // hide internal ML fields from list view
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ authenticityScore: -1 }),
      Creator.countDocuments(query),
    ]);

    res.status(200).json({
      success : true,
      total,
      page    : Number(page),
      pages   : Math.ceil(total / limit),
      data    : creators,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get creator by ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/creators/:id
 */
export const getCreatorById = async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id).select("-socialStats");

    if (!creator) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    res.status(200).json({ success: true, data: creator });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Update creator profile (creator only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/creators
 *
 * If socialStats fields change, re-run ML scoring automatically.
 */
export const updateCreatorProfile = async (req, res, next) => {
  try {
    const { uid } = req.user;

    const updatedCreator = await Creator.findOneAndUpdate(
      { uid },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedCreator) {
      return res.status(404).json({
        success: false,
        message: "Creator profile not found",
      });
    }

    // Re-run ML if the user updated any socialStats field
    if (req.body.socialStats) {
      getAuthenticityScore(updatedCreator, true).catch((err) => {
        console.error(
          `[mlService] Re-scoring failed for creator ${updatedCreator._id}:`,
          err.message
        );
      });
    }

    res.status(200).json({ success: true, data: updatedCreator });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/creators/:id/score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full ML authenticity report for a creator.
 * Vendors use this to view detailed risk indicators before accepting a deal.
 *
 * Response:
 *   {
 *     success            : true,
 *     cached             : boolean,
 *     authenticity_score : int | null,
 *     risk_level         : "Safe" | "Monitor" | "High Risk" | null,
 *     bot_probability    : float | null,
 *     anomaly_score      : float | null,
 *     network_score      : float | null,
 *     component_bot      : float | null,
 *     component_anomaly  : float | null,
 *     component_network  : float | null,
 *     scored_at          : ISO string | null,
 *   }
 */
export const fetchCreatorScore = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Pass ?refresh=true to force a fresh ML prediction even if score is cached
    const forceRefresh = req.query.refresh === "true";

    const result = await getAuthenticityScore(id, forceRefresh);

    if (result.error) {
      return res.status(503).json({
        success : false,
        message : "Authenticity scoring is temporarily unavailable",
        error   : result.error,
      });
    }

    // Fetch scoredAt from DB (not returned by getAuthenticityScore directly)
    const creator = await Creator.findById(id).select("mlDetails");

    res.status(200).json({
      success            : true,
      cached             : result.cached,
      authenticity_score : result.authenticity_score,
      risk_level         : result.risk_level,
      bot_probability    : result.bot_probability,
      anomaly_score      : result.anomaly_score,
      network_score      : result.network_score,
      component_bot      : result.component_bot      ?? null,
      component_anomaly  : result.component_anomaly  ?? null,
      component_network  : result.component_network  ?? null,
      scored_at          : creator?.mlDetails?.scoredAt ?? null,
    });
  } catch (error) {
    next(error);
  }
};
