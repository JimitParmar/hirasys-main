import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
});

export async function aiJSON<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation.\n\n${userPrompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const response = result.response;
    const text = response.text();

    // Clean response — remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleaned) as T;
  } catch (error: any) {
    console.error("Gemini AI JSON error:", error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

export async function aiText(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.5,
      },
    });

    return result.response.text();
  } catch (error: any) {
    console.error("Gemini AI text error:", error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

// Streaming for AI interviews (we'll use this later)
export async function aiStream(
  systemPrompt: string,
  messages: { role: string; content: string }[]
) {
  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I will follow these instructions." }],
      },
      ...messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ],
    generationConfig: {
      temperature: 0.5,
    },
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  return result.stream;
}