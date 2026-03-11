import express from "express";
import errorHandler from "../src/middlewares/error.middleware.js";

import creatorRoutes from "../src/routes/creator.routes.js";
import vendorRoutes from "../src/routes/vendor.routes.js";
import promotionRoutes from "./routes/promotion.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";



const app = express();

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "FakeEngageDetect API",
    version: "1.0.0",
    endpoints: ["/api/auth", "/api/creators", "/api/vendors", "/api/promotions", "/api/users"]
  });
});

app.get("/api", (req, res) => {
  res.json({ message: "FakeEngageDetect API is running" });
});

app.get("/api/test-python", async (req, res) => {
  const { spawn } = await import("child_process");
  const proc = spawn("python3", ["-c", "print('Python works!')"]);
  let output = "";
  proc.stdout.on("data", (d) => { output += d.toString(); });
  proc.on("close", (code) => {
    res.json({ pythonWorks: code === 0, output, exitCode: code });
  });
});

app.use("/api/creators", creatorRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

export default app;
