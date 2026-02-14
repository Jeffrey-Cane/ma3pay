import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

let chatSession: Chat | null = null;
let ai: GoogleGenAI | null = null;

// Safely read the API key injected by Vite's define config.
// Falls back to empty string if no .env file is present.
const GEMINI_KEY: string = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';

// Lazy-initialise the SDK so a missing key never crashes module load
function getAI(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  }
  return ai;
}

export const getChatSession = (): Chat => {
  if (!chatSession) {
    chatSession = getAI().chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
  }
  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const chat = getChatSession();
    const result: GenerateContentResponse = await chat.sendMessage({ message });
    return result.text || "Sorry, I couldn't process that request right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ma3Pay Network Error: I'm having trouble connecting to the station. Please try again.";
  }
};