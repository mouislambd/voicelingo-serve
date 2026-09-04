import { groq } from "./groq";

// Define the order of models to try
const FALLBACK_MODELS = [
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
];

// Timeout in milliseconds
const TIMEOUT_MS = 10000;

export async function callGroqWithFallback(
  params: any // Groq ChatCompletionCreateParams
) {
  let lastError: any;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`Attempting Groq call with model: ${model}`);
      
      // Implement timeout using Promise.race
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const completion = await groq.chat.completions.create(
        { ...params, model },
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      console.log(`Successfully used model: ${model}`);
      return completion;
    } catch (error: any) {
      lastError = error;
      console.warn(`Failed with model ${model}: ${error.message}`);
      // Continue to the next model in the loop
    }
  }

  // If all attempts fail, throw the last error
  console.error("All Groq fallback models failed.");
  throw lastError;
}
