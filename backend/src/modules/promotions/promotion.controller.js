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

    // Send email to creator (non-blocking)
    sendEmail({
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
    }).catch(err => console.error("Failed to send proposal email:", err.message));

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
    ).populate("vendor", "businessName");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Promotion request not found",
      });
    }

    // Notify vendor by email whenever creator accepts (including re-accepts)
    if (status === "accepted" && request.contactEmail) {
      const vendorName =
        typeof request.vendor === "object" && request.vendor?.businessName
          ? request.vendor.businessName
          : "your brand";
      sendEmail({
        to: request.contactEmail,
        subject: `Your proposal "${request.campaignTitle}" was accepted!`,
        html: `
          <h3>Great news, ${vendorName}!</h3>
          <p><strong>${creator.name}</strong> has accepted your collaboration proposal for <strong>${request.campaignTitle}</strong>.</p>
          <p>Please login to your dashboard to proceed with the collaboration.</p>
        `,
      }).catch(err => console.error("Failed to send acceptance email:", err.message));
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

/**
 * Vendor edits a pending promotion request (campaign title / message / budget)
 */
export const editPromotionRequest = async (req, res, next) => {
  try {
    const vendorUid = req.user.uid;
    const { requestId, campaignTitle, message, proposedBudget } = req.body;

    const vendor = await User.findOne({ uid: vendorUid });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const request = await PromotionRequest.findOneAndUpdate(
      { _id: requestId, vendor: vendor._id, status: "pending" },
      { $set: { campaignTitle, message, proposedBudget } },
      { new: true }
    ).populate("creator", "name niche country pricePerPost platforms");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pending request not found or already responded to",
      });
    }

    res.status(200).json({ success: true, message: "Proposal updated", data: request });
  } catch (error) {
    next(error);
  }
};

/**
 * Vendor deletes a pending proposal
 */
export const deletePromotionRequest = async (req, res, next) => {
  try {
    const vendorUid = req.user.uid;
    const { requestId } = req.params;

    const vendor = await User.findOne({ uid: vendorUid });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const request = await PromotionRequest.findOneAndDelete({
      _id: requestId,
      vendor: vendor._id,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pending proposal not found or already responded to",
      });
    }

    res.status(200).json({ success: true, message: "Proposal deleted" });
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
      .populate("creator", "name niche country pricePerPost platforms profileImageUrl")
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

