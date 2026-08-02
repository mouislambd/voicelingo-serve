import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import * as practiceController from "../controllers/practice.controller";

const router = Router();

router.post("/start", requireAuth, practiceController.startSession);
router.post("/message", requireAuth, practiceController.sendMessage);
router.post("/end", requireAuth, practiceController.endSession);
router.get("/progress", requireAuth, practiceController.getUserProgress);
router.get("/history", requireAuth, practiceController.getSessionHistory);
router.get("/session/:sessionId", requireAuth, practiceController.getSession);
router.delete("/session/:sessionId", requireAuth, practiceController.deleteSession);
router.get("/recommendation", requireAuth, practiceController.getRecommendation);

export default router;
