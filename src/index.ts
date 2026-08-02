import express from "express";
import cors from "cors";
import "dotenv/config";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import connectDB from "./config/db";
import practiceRoutes from "./routes/practice.routes";
import topicRoutes from "./routes/topic.routes";
import demoRoutes from "./routes/demo.routes";

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Better Auth
app.use("/api/auth", (req, res, next) => {
  console.log("--- Auth Request ---");
  console.log("Method:", req.method, "URL:", req.url);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Cookies:", req.headers.cookie);

  // Capture Set-Cookie headers
  const originalSend = res.send;
  res.send = function (body) {
    const setCookie = res.getHeader("Set-Cookie");
    console.log("--- Auth Response ---");
    console.log("Set-Cookie:", setCookie);
    return originalSend.apply(this, arguments as any);
  };
  next();
});

app.all("/api/auth/*splat", toNodeHandler(auth));

// JSON Body Parser
app.use(express.json());

// Practice Routes
app.use("/api/practice", practiceRoutes);

// Topic Routes
app.use("/api/topics", topicRoutes);

// Demo Routes
app.use("/api/demo", demoRoutes);

// Health Check
app.get("/", (req, res) => {
  res.send("VoiceLingo Server is running");
});

// Database Connection
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
