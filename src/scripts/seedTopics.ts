import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db";
import { Topic } from "../models/topic.model";

const seedData = [
  { title: "Daily Routine Chat", description: "Practice describing your typical day, from morning to night.", level: "beginner", category: "Daily Life" },
  { title: "Ordering Food at a Restaurant", description: "Practice ordering meals, asking about the menu, and making requests.", level: "beginner", category: "Daily Life" },
  { title: "Job Interview Practice", description: "Practice answering common interview questions confidently.", level: "intermediate", category: "Business" },
  { title: "Making Small Talk", description: "Practice casual conversation starters and responses.", level: "beginner", category: "Daily Life" },
  { title: "Travel and Directions", description: "Practice asking for directions and talking about travel plans.", level: "intermediate", category: "Travel" },
  { title: "Business Negotiation", description: "Practice professional negotiation language and persuasive speaking.", level: "advanced", category: "Business" },
];

async function seed() {
  await connectDB();
  const count = await Topic.countDocuments();
  if (count === 0) {
    await Topic.insertMany(seedData);
    console.log("Topics seeded successfully.");
  } else {
    console.log("Topics already exist, skipping seeding.");
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
