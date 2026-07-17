import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client safely with lazy checks
let ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY is not defined. AI template generation and troubleshooting will run in simulated mode.");
    }
    ai = new GoogleGenAI({
      apiKey: apiKey || "dummy-key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

/**
 * Suggest a notification template copy and its variables based on user prompt
 */
export async function generateAITemplate(prompt: string, channel: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Cannot generate template.");
  }

  try {
    const client = getGeminiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Create a notification template for the channel "${channel}" based on this request: "${prompt}".
Provide the response in raw JSON format matching this schema:
{
  "subject": "Email/Notification subject line (empty if SMS/WhatsApp doesn't use it)",
  "content": "The template body content using standard placeholders like {{variableName}}",
  "variables": ["list", "of", "variables", "used", "in", "the", "placeholders"]
}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert copywriter for professional enterprise notification templates. Write engaging, clean copy, and output only valid JSON.",
        temperature: 0.7,
      }
    });

    if (result.text) {
      return JSON.parse(result.text.trim());
    }
    throw new Error("No text returned from Gemini");
  } catch (error: any) {
    console.error("Gemini template generation failed:", error.message);
    throw error;
  }
}

/**
 * Troubleshooting assistance for notification failure logs
 */
export async function troubleshootFailureLog(errorMessage: string, provider: string, channel: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Cannot troubleshoot.");
  }

  try {
    const client = getGeminiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `We had a notification delivery failure using provider "${provider}" on channel "${channel}".
Error message: "${errorMessage}".
Explain what this error means, what likely caused it (such as network blocks, wrong credentials, template approval issues, or missing credits), and give 3 precise, actionable steps to fix it.`,
      config: {
        systemInstruction: "You are AuraAlert AI Troubleshooter, a helpful system administrator expert in SMTP, Twilio SMS, WhatsApp Business API, and Firebase Push Notification channels.",
        temperature: 0.3,
      }
    });

    return result.text || "No analysis could be completed at this time.";
  } catch (error: any) {
    console.error("Gemini troubleshooting failed:", error.message);
    throw error;
  }
}

