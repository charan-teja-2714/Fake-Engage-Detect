import PromotionRequest from "./promotionRequest.model.js";
import Creator from "../creators/creator.model.js";
import User from "../users/user.model.js";
import { sendEmail } from "../../services/email.service.js";

/**
 * Vendor sends promotion request
 */
export const sendPromotionRequest = async (req, res, next) => {
  try {
    const vendorUid = req.user.uid;
    const { creatorId, campaignTitle, message, proposedBudget } = req.body;

    const vendor = await User.findOne({ uid: vendorUid });
    const creator = await Creator.findById(creatorId);

    if (!vendor || !creator) {
      return res.status(404).json({
        success: false,
        message: "Vendor or Creator not found",
      });
    }

    // Save request in DB
    const request = await PromotionRequest.create({
      vendor: vendor._id,
      creator: creator._id,
      campaignTitle,
      message,
      proposedBudget,
      contactEmail: vendor.email,
    });

    // Send email to creator
    await sendEmail({
      to: creator.email,
      subject: `New Promotion Request: ${campaignTitle}`,
      html: `
        <h3>Hello ${creator.name},</h3>
        <p>You have received a new promotion request.</p>
        <p><strong>From:</strong> ${vendor.businessName}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <p><strong>Proposed Budget:</strong> ₹${proposedBudget}</p>
        <br/>
        <p>Please login to your dashboard to respond.</p>
      `,
    });

    res.status(201).json({
      success: true,
      message: "Promotion request sent successfully",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creator views received promotion requests
 */
export const getCreatorRequests = async (req, res, next) => {
  try {
    const creatorUid = req.user.uid;

    const creator = await Creator.findOne({ uid: creatorUid });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const requests = await PromotionRequest.find({
      creator: creator._id,
    })
      .populate("vendor", "businessName industry")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePromotionStatus = async (req, res, next) => {
  try {
    const { requestId, status } = req.body; // status = accepted | rejected
    const creatorUid = req.user.uid;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const creator = await Creator.findOne({ uid: creatorUid });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const request = await PromotionRequest.findOneAndUpdate(
      { _id: requestId, creator: creator._id },
      { $set: { status } },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Promotion request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorRequests = async (req, res, next) => {
  try {
    const vendorUid = req.user.uid;

    const vendor = await User.findOne({ uid: vendorUid });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const requests = await PromotionRequest.find({
      vendor: vendor._id,
    })
      .populate("creator", "name niche country pricePerPost")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

