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
    // Return high-quality pre-baked mock responses if no key is supplied
    return getPrebakedTemplate(prompt, channel);
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
    return getPrebakedTemplate(prompt, channel);
  }
}

/**
 * Troubleshooting assistance for notification failure logs
 */
export async function troubleshootFailureLog(errorMessage: string, provider: string, channel: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getPrebakedTroubleshoot(errorMessage, provider, channel);
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
    return getPrebakedTroubleshoot(errorMessage, provider, channel);
  }
}

// Fallbacks for offline / missing API key states to keep UX beautiful
function getPrebakedTemplate(prompt: string, channel: string) {
  const cleanPrompt = prompt.toLowerCase();
  if (cleanPrompt.includes("welcome") || cleanPrompt.includes("signup") || cleanPrompt.includes("register")) {
    return {
      subject: "Welcome to our platform! 🚀",
      content: `Hi {{firstName}},\n\nThank you for signing up for our platform. We are thrilled to have you here!\n\nTo get started, please explore your dashboard or check out our quick start guide. If you have any questions, reply to this email directly.\n\nBest regards,\nThe {{companyName}} Team`,
      variables: ["firstName", "companyName"]
    };
  }
  if (cleanPrompt.includes("alert") || cleanPrompt.includes("critical") || cleanPrompt.includes("fail") || cleanPrompt.includes("maintenance")) {
    return {
      subject: "⚠️ System Alert: {{alertTitle}}",
      content: `Attention Security Team,\n\nA critical system event has occurred on server {{serverName}}.\nDetails: {{alertDetails}}\nSeverity: {{severity}}\n\nPlease review and action this alert immediately.`,
      variables: ["alertTitle", "serverName", "alertDetails", "severity"]
    };
  }
  // Generic beautiful response
  return {
    subject: `Update regarding {{subjectTopic}}`,
    content: `Hello {{firstName}},\n\nThis is an automated notification regarding {{subjectTopic}}.\n\nDetails: {{detailsText}}\n\nIf you did not request this update, please contact our support desk immediately.\n\nCheers,\n{{senderSignature}}`,
    variables: ["firstName", "subjectTopic", "detailsText", "senderSignature"]
  };
}

function getPrebakedTroubleshoot(errorMessage: string, provider: string, channel: string) {
  const err = errorMessage.toLowerCase();
  if (err.includes("timeout") || err.includes("connection closed") || err.includes("connection refused")) {
    return `### 🚨 Analysis of Connection/Timeout Error
This error indicates that AuraAlert tried to communicate with **${provider}** over **${channel}**, but the connection timed out or was blocked.

#### 🔍 Likely Causes:
1. **Network Firewall / Ingress Rules**: Outbound connection to port 587 or 465 is blocked by your hosting container environment.
2. **Incorrect Hostname / Port**: The SMTP host or Twilio endpoint is incorrectly configured.
3. **Provider Outage**: The upstream provider is experiencing transient downtime.

#### ✅ Actionable Next Steps:
1. Double-check your **Provider Credentials** settings in the dashboard. Ensure the Host port matches the TLS/SSL requirements.
2. Verify if outbound ports are open on your cloud hosting network.
3. Check the official status page for **${provider}** to confirm if services are fully online.`;
  }

  if (err.includes("credentials") || err.includes("unauthorized") || err.includes("auth") || err.includes("forbidden") || err.includes("key")) {
    return `### 🚨 Analysis of Authentication Error
This error indicates that **${provider}** rejected AuraAlert's API keys, tokens, or credentials for the **${channel}** channel.

#### 🔍 Likely Causes:
1. **Expired Token/API Key**: The API key or SMTP password has been rotated or revoked at the provider console.
2. **Sub-Account Mismatch**: The Twilio Account SID or Meta WhatsApp ID doesn't match the token.
3. **Incorrect Permissions**: The API key lacks the scope/capability to send alerts.

#### ✅ Actionable Next Steps:
1. Log into your **${provider}** dashboard, generate a fresh API token/key, and replace it in AuraAlert's Provider Config panel.
2. Ensure you have copied the full Secret string, avoiding trailing whitespaces or line-breaks.
3. Test your provider health by clicking the 'Health Check' button on the configured card.`;
  }

  return `### 🚨 Analysis of Channel Error
The notification failed with: \`${errorMessage}\` using **${provider}** on the **${channel}** channel.

#### 🔍 Likely Causes:
1. **Invalid Recipient Format**: The recipient phone number or email address is malformed (e.g., missing country code for SMS/WhatsApp).
2. **Account Balance / Limit**: Upstream credits or trial balance has been exhausted.
3. **Template Block**: For WhatsApp, the template content might not be approved by Meta.

#### ✅ Actionable Next Steps:
1. Verify that the recipient address or number matches standard international notation.
2. Confirm your billing status and account limits with **${provider}**.
3. Attempt to resend using another provider or verify template approvals.`;
}
