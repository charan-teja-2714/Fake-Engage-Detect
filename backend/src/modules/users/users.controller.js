import User from "./user.model.js";

export const registerVendor = async (req, res, next) => {
  try {
    const { uid, email } = req.user;
    const { businessName, country,industry } = req.body;

    const existing = await User.findOne({ uid });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Vendor already registered",
      });
    }

    const vendor = await User.create({
      uid,
      email,
      role: "vendor",
      businessName,
      industry,
      country,
    });

    res.status(201).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};
