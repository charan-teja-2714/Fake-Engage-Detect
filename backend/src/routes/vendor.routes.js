import express from "express";
import {
  searchCreators,
  viewCreatorProfile,
  saveCreator,
} from "../modules/vendors/vendor.controller.js";

import firebaseAuth from "../middlewares/firebaseAuth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const router = express.Router();

/**
 * Vendor-only routes
 */
router.get(
  "/creators",
  firebaseAuth,
  authorizeRoles("vendor"),
  searchCreators
);

router.get(
  "/creators/:id",
  firebaseAuth,
  authorizeRoles("vendor"),
  viewCreatorProfile
);

router.post(
  "/creators/save",
  firebaseAuth,
  authorizeRoles("vendor"),
  saveCreator
);

export default router;
