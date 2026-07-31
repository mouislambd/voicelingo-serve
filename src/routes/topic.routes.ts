import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import * as topicController from "../controllers/topic.controller";

const router = Router();

router.post("/", requireAuth, requireRole("admin"), topicController.createTopic);
router.get("/", topicController.getTopics);
router.delete("/:id", requireAuth, requireRole("admin"), topicController.deleteTopic);

export default router;
