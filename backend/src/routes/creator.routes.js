import express from "express";
import {
  createCreatorProfile,
  getAllCreators,
  getCreatorById,
  updateCreatorProfile,
  fetchCreatorScore,
} from "../modules/creators/creator.controller.js";

import firebaseAuth    from "../middlewares/firebaseAuth.middleware.js";
import authorizeRoles  from "../middlewares/role.middleware.js";

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// List all creators with optional filters
router.get("/", getAllCreators);

// Get authenticity score + full ML breakdown for a specific creator
// Public so vendors can view it without needing the creator role.
// Supports ?refresh=true to force re-scoring.
router.get("/:id/score", fetchCreatorScore);

// Get single creator profile (must be after /:id/score to avoid route conflict)
router.get("/:id", getCreatorById);

// ── Protected routes (creator only) ──────────────────────────────────────────

// Register new creator profile (triggers background ML scoring)
// Only needs firebaseAuth — authorizeRoles cannot be used here because
// the creator document doesn't exist yet when registering for the first time.
router.post(
  "/",
  firebaseAuth,
  createCreatorProfile
);

// Update own profile (re-triggers ML if socialStats changed)
router.put(
  "/",
  firebaseAuth,
  authorizeRoles("creator"),
  updateCreatorProfile
);

export default router;
