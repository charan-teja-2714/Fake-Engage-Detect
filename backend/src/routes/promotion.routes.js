import express from "express";
import {
  sendPromotionRequest,
  getCreatorRequests,
  updatePromotionStatus,
  getVendorRequests,
  editPromotionRequest,
  deletePromotionRequest,
} from "../modules/promotions/promotion.controller.js";

import firebaseAuth from "../middlewares/firebaseAuth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const router = express.Router();

/**
 * Vendor → Send request
 */
router.post(
  "/",
  firebaseAuth,
  authorizeRoles("vendor"),
  sendPromotionRequest
);

/**
 * Creator → View received requests
 */
router.get(
  "/creator",
  firebaseAuth,
  authorizeRoles("creator"),
  getCreatorRequests
);

router.put(
  "/status",
  firebaseAuth,
  authorizeRoles("creator"),
  updatePromotionStatus
);

router.get(
  "/vendor",
  firebaseAuth,
  authorizeRoles("vendor"),
  getVendorRequests
);

router.put(
  "/edit",
  firebaseAuth,
  authorizeRoles("vendor"),
  editPromotionRequest
);

router.delete(
  "/:requestId",
  firebaseAuth,
  authorizeRoles("vendor"),
  deletePromotionRequest
);

export default router;
