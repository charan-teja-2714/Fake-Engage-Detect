import express from "express";
import firebaseAuth from "../middlewares/firebaseAuth.middleware.js";
import { registerVendor } from "../modules/users/users.controller.js";

const router = express.Router();

router.post("/register", firebaseAuth, registerVendor);

export default router;
