import User from "../modules/users/user.model.js";
import Creator from "../modules/creators/creator.model.js";

const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { uid } = req.user;

      let account = null;

      if (allowedRoles.includes("vendor")) {
        account = await User.findOne({ uid });
      }

      if (allowedRoles.includes("creator")) {
        account = await Creator.findOne({ uid });
      }

      if (!account) {
        return res.status(403).json({
          success: false,
          message: "User not registered in system",
        });
      }

      req.user.role = allowedRoles[0];
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorizeRoles;
