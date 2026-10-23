import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

function groq(apiKey) {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key || key === 'replace_me') throw new Error('Groq API Key မထည့်ရသေးပါ။ Settings ထဲမှာ Groq key ထည့်ပါ သို့မဟုတ် server environment variable သတ်မှတ်ပါ။');
  return new Groq({ apiKey: key });
}
function gemini(apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === 'replace_me') throw new Error('Gemini API Key မထည့်ရသေးပါ။ Settings ထဲမှာ Gemini key ထည့်ပါ သို့မဟုတ် server environment variable သတ်မှတ်ပါ။');
  return new GoogleGenAI({ apiKey: key });
}
export async function generateRecap({ title, language = 'Burmese', duration = '5 minutes', notes = '' }, apiKey) {
  const completion = await groq(apiKey).chat.completions.create({
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
export async function cleanSubtitle({ text, targetLanguage = 'Burmese', task = 'proofread' }, apiKey) {
  const prompt = 'Task: ' + task + '. Target language: ' + targetLanguage + '. Improve subtitle text while preserving meaning, names, and line order. Do not add plot facts. Return only revised text.\n\n' + text;
  const response = await gemini(apiKey).models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: prompt });
  return response.text || '';
}
export async function testGroq(apiKey) {
  const response = await groq(apiKey).chat.completions.create({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Reply with exactly: Groq connection OK' }], max_tokens: 20 });
  return Boolean(response.choices?.[0]?.message?.content);
}
export async function testGemini(apiKey) {
  const response = await gemini(apiKey).models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: 'Reply with exactly: Gemini connection OK' });
  return Boolean(response.text);
}


export async function describeMovieFrames(frames, apiKey) {
  const prompt = 'You are analyzing selected keyframes from a movie in chronological order. For each image, describe only visible content in one concise sentence. Do not infer unseen plot details. Return JSON array with objects {index, description, mood, visible_action}. Keep index matching the provided frame number.';
  const parts = [{ text: prompt }];
  for (const frame of frames) {
    parts.push({ text: 'Frame index: ' + frame.index + ', approximate timestamp: ' + frame.time + ' seconds.' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frame.base64 } });
  }
  const response = await gemini(apiKey).models.generateContent({
    model: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', temperature: 0.2 }
  });
  const raw = response.text || '[]';
  try { return JSON.parse(raw); } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Gemini Vision က JSON အဖြေမပြန်ပါ။');
  }
}

export async function matchScenesToNarration(script, scenes, targetDuration, apiKey) {
  const prompt = 'You are a movie recap editor. Match Burmese narration paragraphs to the most relevant candidate scenes using only the supplied frame descriptions and timestamps. Select scenes in a coherent order; do not invent scenes. Return JSON only: {"selections":[{"sceneIndex":0,"narration":"exact matching short narration paragraph","reason":"brief reason","start":0,"end":5}]}. Scene indices refer to candidate scene index. Keep each clip 3-12 seconds when possible, never overlap clips, and target total duration about ' + targetDuration + ' seconds. If scene evidence is insufficient, say so in reason.\nNARRATION:\n' + script.slice(0, 18000) + '\nCANDIDATE SCENES:\n' + JSON.stringify(scenes).slice(0, 24000);
  const response = await gemini(apiKey).models.generateContent({
    model: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', temperature: 0.2 }
  });
  const raw = response.text || '{}';
  try { return JSON.parse(raw); } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Gemini က Scene Timeline JSON အဖြေမပြန်ပါ။');
  }
}
