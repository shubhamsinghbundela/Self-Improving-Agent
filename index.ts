import OpenAI from "openai";
const openai = new OpenAI();
const r = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Say hi" }],
});
console.log(r!.choices[0]!.message.content);
