import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function aiJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  model: string = "gpt-4o-mini"
): Promise<T> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content || "{}") as T;
}

export async function aiText(
  systemPrompt: string,
  userPrompt: string,
  model: string = "gpt-4o-mini"
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
  });

  return response.choices[0].message.content || "";
}