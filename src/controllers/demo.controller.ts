import { Request, Response } from "express";
import { groq } from "../lib/groq";

export const getFeedback = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    // Basic validation
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ message: "Text is required" });
    }
    if (text.length > 200) {
      return res.status(400).json({ message: "Text too long" });
    }

    const systemPrompt = `You are a friendly, encouraging English teacher providing quick feedback on ONE sentence.
Analyze the following sentence for grammar and fluency. 
Return response ONLY as valid JSON: { "feedback": "string", "hasMistake": boolean, "correctedText": "string|null" }`;

    const models = (process.env.GROQ_MODEL || "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.6-27b").split(",");
    
    let aiResponse;
    let success = false;
    let lastError;

    for (const model of models) {
      try {
        console.log(`Attempting to use Groq model: ${model.trim()}`);
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Sentence: "${text}"` }
          ],
          model: model.trim(),
          response_format: { type: "json_object" },
        });

        aiResponse = JSON.parse(completion.choices[0].message.content!);
        console.log(`Successfully used Groq model: ${model.trim()}`);
        success = true;
        break;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || "";
        // Check for specific error indications for model failure
        if (errorMessage.includes("model_decommissioned") || errorMessage.includes("model_not_found") || error.status === 404 || error.status === 400) {
           console.warn(`Model ${model.trim()} failed, trying next. Error: ${errorMessage}`);
           continue;
        }
        // If it's a different error, rethrow it to handle in the main catch block
        throw error;
      }
    }

    if (!success) {
       throw lastError || new Error("All Groq models failed");
    }

    res.json(aiResponse);
  } catch (error) {
    console.error("getFeedback error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    res.status(500).json({ message: "Failed to process feedback", error: error instanceof Error ? error.message : "Unknown error" });
  }
};
