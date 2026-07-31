import { Request, Response } from "express";
import { Topic } from "../models/topic.model";

export const createTopic = async (req: Request, res: Response) => {
  try {
    const topic = await Topic.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(topic);
  } catch (error) {
    console.error("createTopic error:", error);
    res.status(500).json({ message: "Failed to create topic" });
  }
};

export const getTopics = async (req: Request, res: Response) => {
  try {
    const { level, category } = req.query;
    const filter: any = {};
    if (level) filter.level = level;
    if (category) filter.category = category;
    
    const topics = await Topic.find(filter);
    res.json(topics);
  } catch (error) {
    console.error("getTopics error:", error);
    res.status(500).json({ message: "Failed to fetch topics" });
  }
};

export const deleteTopic = async (req: Request, res: Response) => {
  try {
    await Topic.findByIdAndDelete(req.params.id);
    res.json({ message: "Topic deleted" });
  } catch (error) {
    console.error("deleteTopic error:", error);
    res.status(500).json({ message: "Failed to delete topic" });
  }
};
