import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PracticeSession } from "../models/practiceSession.model";
import { UserProgress } from "../models/userProgress.model";
import { Topic } from "../models/topic.model";
import { callGroqWithFallback } from "../lib/groqFallback";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export const customStartImage = async (req: Request, res: Response) => {
  if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not defined in environment variables");
      return res.status(500).json({ message: "Configuration error" });
  }

  try {
    const { imageBase64, context } = req.body;
    if (!imageBase64) return res.status(400).json({ message: "Image is required" });

    // Validate size (approximate for base64 string length)
    // 10MB limit * 1.33 = ~13.3 million chars
    if (imageBase64.length > 14000000) {
      return res.status(400).json({ message: "Image too large" });
    }

    // Determine mime type (assuming png/jpg/webp)
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const base64Data = imageBase64.split(",")[1] || imageBase64;

    const prompt = `Look at this image and suggest ONE specific English conversation practice topic based on what you see. 
    ${context ? `Additional context: ${context}` : ""}
    Respond in JSON format: { "topicTitle": "string", "topicDescription": "string" }`;

    if (!genAI) {
        throw new Error("Gemini API key is not configured");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        },
    ]);

    const responseText = result.response.text();
    const topicData = JSON.parse(responseText.replace(/```json|```/g, ""));

    // Create session
    const session = await PracticeSession.create({
      userId: req.user.id,
      topic: topicData.topicTitle,
      level: "intermediate", // Default
      transcript: [],
      mistakes: [],
      focusArea: topicData.topicDescription,
    });

    // Generate opening message using existing Groq logic
    const systemPrompt = `You are a friendly, encouraging conversation partner.
    The student is practicing: ${topicData.topicTitle}.
    Start the conversation by welcoming the student and asking a question related to this topic based on: ${topicData.topicDescription}.`;

    const completion = await callGroqWithFallback({
      messages: [{ role: "system", content: systemPrompt }],
    });

    const aiMessage = completion.choices[0].message.content!;
    session.transcript.push({ role: "ai", text: aiMessage, timestamp: new Date() });
    await session.save();

    res.status(201).json({ sessionId: session._id, message: "Session started" });
  } catch (error: any) {
    console.error("customStartImage error details:", {
        message: error.message,
        stack: error.stack,
        status: error.status,
        errorDetails: error.errorDetails,
        response: error.response?.data
    });
    const statusCode = error.status || 500;
    res.status(statusCode).json({ message: "Failed to start custom session", error: error.message, details: error.response?.data });
  }
};

export const startSession = async (req: Request, res: Response) => {
  try {
    const { topicId, topic, level, focusArea } = req.body;
    let finalTopic = topic;
    let finalLevel = level;
    let finalFocusArea = focusArea;

    if (topicId) {
      const t = await Topic.findById(topicId);
      if (t) {
        finalTopic = t.title;
        finalLevel = t.level;
      }
    }

    const session = await PracticeSession.create({
      userId: req.user.id,
      topic: finalTopic,
      level: finalLevel,
      transcript: [],
      mistakes: [],
      focusArea: finalFocusArea,
    });
    res.status(201).json({ sessionId: session._id, message: "Session started" });
  } catch (error) {
    console.error("startSession error:", error);
    res.status(500).json({ message: "Failed to start session" });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;
    const session = await PracticeSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.transcript.push({ role: "user", text: message, timestamp: new Date() });

    const focusAreaPrompt = session.focusArea 
        ? `\nALSO, during this conversation, pay special attention to the student's use of ${session.focusArea} and gently correct/guide them if they make related mistakes.`
        : "";

    const systemPrompt = `You are a friendly, encouraging conversation partner helping a student practice their ${session.topic} topic at a ${session.level} level. 
Respond naturally as a human would.
ALSO, analyze the student's last message for grammar/vocabulary issues.${focusAreaPrompt}
Return response ONLY as valid JSON: { "reply": "string", "feedback": { "hasMistake": boolean, "mistakeNote": "string|null" } }`;

    const completion = await callGroqWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        ...session.transcript.map((t): { role: "user" | "assistant", content: string } => ({ 
          role: t.role === "ai" ? "assistant" : "user", 
          content: t.text 
        })),
      ],
      response_format: { type: "json_object" },
    });

    const aiResponseRaw = completion.choices[0].message.content!;
    const cleanedResponse = aiResponseRaw.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanedResponse);
    session.transcript.push({ role: "ai", text: aiResponse.reply, timestamp: new Date() });
    
    if (aiResponse.feedback && aiResponse.feedback.hasMistake && aiResponse.feedback.mistakeNote) {
      session.mistakes.push(aiResponse.feedback.mistakeNote);
    }

    await session.save();
    res.json({ 
      reply: aiResponse.reply, 
      feedback: aiResponse.feedback,
      shouldEndSession: session.transcript.length >= 30
    });
  } catch (error: any) {
    console.error("sendMessage error:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    const statusCode = error.status || 500;
    const errorMessage = error.message || "Failed to process message";
    
    res.status(statusCode).json({ 
        message: "Failed to process message", 
        error: errorMessage,
        details: error.response?.data || "No additional details" 
    });
  }
};

export const endSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const session = await PracticeSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const completion = await callGroqWithFallback({
      messages: [
        { role: "system", content: "Analyze this practice session and return JSON: { 'summary': '2-3 sentences', 'score': number(0-10), 'weakAreaTags': ['string', 'string'] }. weakAreaTags should be 1-3 word grammar/vocab category tags." },
        { role: "user", content: JSON.stringify({ transcript: session.transcript, mistakes: session.mistakes }) }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content!);
    session.summary = result.summary;
    session.score = result.score;
    await session.save();

    let progress = await UserProgress.findOne({ userId: req.user.id });
    if (!progress) {
      progress = new UserProgress({ userId: req.user.id });
    }

    progress.totalSessions += 1;
    progress.averageScore = (progress.averageScore * (progress.totalSessions - 1) + result.score) / progress.totalSessions;
    progress.lastPracticedAt = new Date();
    
    result.weakAreaTags.forEach((tag: string) => { 
      if (!progress!.weakAreas.includes(tag)) {
        progress!.weakAreas.push(tag);
      }
    });

    if (progress!.weakAreas.length > 20) {
      progress!.weakAreas = progress!.weakAreas.slice(-20);
    }
    
    if (progress!.averageScore > 8 && progress!.currentLevel === "beginner") progress!.currentLevel = "intermediate";
    else if (progress!.averageScore > 9 && progress!.currentLevel === "intermediate") progress!.currentLevel = "advanced";

    await progress.save();
    res.json({ summary: result.summary, score: result.score, weakAreaTags: result.weakAreaTags, message: "Session ended" });
  } catch (error: any) {
    console.error("endSession error:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
    });
    const statusCode = error.status || 500;
    res.status(statusCode).json({ message: "Failed to end session", error: error.message, details: error.response?.data });
  }
};

export const getUserProgress = async (req: Request, res: Response) => {
  try {
    const sessions = await PracticeSession.find({ userId: req.user.id, score: { $exists: true } });
    
    const totalSessions = sessions.length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
    const averageScore = totalSessions > 0 ? (totalScore / totalSessions) : 0;
    
    // Aggregate weak areas from all sessions if needed, or keep using UserProgress
    const progress = await UserProgress.findOne({ userId: req.user.id });

    res.json({ 
      userId: req.user.id, 
      totalSessions, 
      averageScore, 
      weakAreas: progress ? progress.weakAreas : [],
      currentLevel: progress ? progress.currentLevel : "beginner"
    });
  } catch (error) {
    console.error("getUserProgress error:", error);
    res.status(500).json({ message: "Failed to fetch progress" });
  }
};

export const getSessionHistory = async (req: Request, res: Response) => {
  try {
    const sessions = await PracticeSession.find({ userId: req.user.id })
      .select("topic level score summary createdAt")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(sessions);
  } catch (error) {
    console.error("getSessionHistory error:", error);
    res.status(500).json({ message: "Failed to fetch history" });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await PracticeSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch (error) {
    console.error("getSession error:", error);
    res.status(500).json({ message: "Failed to fetch session" });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const result = await PracticeSession.deleteOne({ _id: sessionId, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Session not found or unauthorized" });
    }
    res.json({ message: "Session deleted" });
  } catch (error) {
    console.error("deleteSession error:", error);
    res.status(500).json({ message: "Failed to delete session" });
  }
};

export const getRecommendation = async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const progress = await UserProgress.findOne({ userId });
      const sessions = await PracticeSession.find({ userId }).sort({ createdAt: -1 }).limit(5);
  
      const weakAreaTags = progress ? progress.weakAreas : [];
      const recentScores = sessions.map(s => s.score || 0);
  
      const systemPrompt = `You are an AI English learning advisor.
  Given these student details: Weak areas: [${weakAreaTags.join(", ")}], Recent scores: [${recentScores.join(", ")}].
  Recommend ONE specific topic to practice next. Explain why (1-2 sentences). Give ONE specific focus area (e.g., 'subject-verb agreement').
  Return response ONLY as valid JSON: { "recommendedTopicCategory": "string", "reason": "string", "focusArea": "string" }`;
  
      const completion = await callGroqWithFallback({
        messages: [{ role: "system", content: systemPrompt }],
        response_format: { type: "json_object" },
      });
  
      const rec = JSON.parse(completion.choices[0].message.content!);
      
      // Find a matching topic
      const topic = await Topic.findOne({ category: rec.recommendedTopicCategory }) || await Topic.findOne();
  
      res.json({
        topic: topic ? { id: topic._id, title: topic.title, level: topic.level } : { title: "General Conversation", level: "intermediate" },
        reason: rec.reason,
        focusArea: rec.focusArea
      });
    } catch (error: any) {
      console.error("getRecommendation error:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      const statusCode = error.status || 500;
      res.status(statusCode).json({ message: "Failed to get recommendation", error: error.message, details: error.response?.data });
    }
  };
