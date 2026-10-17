import { GoogleGenAI } from "@google/genai";

export async function GET() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: "Tell about India in 100 words",
  });
  return Response.json({ text: res.text });
}