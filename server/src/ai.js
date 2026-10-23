import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

const groq = () => {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY မထည့်ရသေးပါ။ server/.env ကို စစ်ပါ။');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};
const gemini = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY မထည့်ရသေးပါ။ server/.env ကို စစ်ပါ။');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};
export async function generateRecap({ title, language = 'Burmese', duration = '5 minutes', notes = '' }) {
  const completion = await groq().chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a careful movie recap scriptwriter. Do not invent plot details. If source notes are incomplete, say so and request plot notes. Avoid reproducing long dialogue or copyrighted screenplay text. Write natural voice-over narration.' },
      { role: 'user', content: 'Write a ' + duration + ' movie recap voice-over in ' + language + '. Title: ' + (title || 'Not provided') + '. User-provided plot notes: ' + (notes || 'No notes supplied; provide a fill-in template and request plot details.') + '. Include a hook, narration paragraphs, and ending summary.' }
    ],
    temperature: 0.6,
    max_tokens: 3000
  });
  return completion.choices?.[0]?.message?.content || '';
}
export async function cleanSubtitle({ text, targetLanguage = 'Burmese', task = 'proofread' }) {
  const prompt = 'Task: ' + task + '. Target language: ' + targetLanguage + '. Improve subtitle text while preserving meaning, names, and line order. Do not add plot facts. Return only revised text.\n\n' + text;
  const response = await gemini().models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: prompt });
  return response.text || '';
}
