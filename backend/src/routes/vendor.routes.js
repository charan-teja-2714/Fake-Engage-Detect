import express from "express";
import {
  searchCreators,
  viewCreatorProfile,
  saveCreator,
  getSavedCreators,
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

// Must be before /creators/:id so it doesn't get caught as an ID
router.get(
  "/creators/saved",
  firebaseAuth,
  authorizeRoles("vendor"),
  getSavedCreators
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
