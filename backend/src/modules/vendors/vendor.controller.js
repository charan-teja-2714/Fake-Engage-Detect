import Creator from "../creators/creator.model.js";

/**
 * Search creators (keyword + filters + pagination)
 */
export const searchCreators = async (req, res, next) => {
  try {
    const {
      keyword,
      niche,
      country,
      minPrice,
      maxPrice,
      minScore,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Keyword search (name or niche)
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { niche: { $regex: keyword, $options: "i" } },
      ];
    }

    // Exact filters
    if (niche) query.niche = niche;
    if (country) query.country = country;

    // Price range filter
    if (minPrice || maxPrice) {
      query.pricePerPost = {};
      if (minPrice) query.pricePerPost.$gte = Number(minPrice);
      if (maxPrice) query.pricePerPost.$lte = Number(maxPrice);
    }

    // Authenticity score filter
    if (minScore) {
      query.authenticityScore = { $gte: Number(minScore) };
    }

    const creators = await Creator.find(query)
      .select("-email") // hide private fields
      .sort({ authenticityScore: -1 }) // best creators first
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Creator.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: creators,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View creator profile by ID
 */
export const viewCreatorProfile = async (req, res, next) => {
  try {
    const creator = await Creator.findById(req.params.id).select("-email");

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    res.status(200).json({
      success: true,
      data: creator,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save viewed creator (optional feature)
 */
export const saveCreator = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { creatorId } = req.body;

    // Optional: store in vendor document or separate collection
    // For now, just simulate success

    res.status(200).json({
      success: true,
      message: "Creator saved successfully",
      creatorId,
    });
  } catch (error) {
    next(error);
  }
};
