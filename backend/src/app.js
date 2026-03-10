import express from "express";
import errorHandler from "../src/middlewares/error.middleware.js";

import creatorRoutes from "../src/routes/creator.routes.js";
import vendorRoutes from "../src/routes/vendor.routes.js";
import promotionRoutes from "./routes/promotion.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";



const app = express();

app.use(express.json());

app.use("/api/creators", creatorRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

export default app;
