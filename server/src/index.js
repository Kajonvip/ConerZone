import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { generateRecap, cleanSubtitle, testGroq, testGemini, describeMovieFrames, matchScenesToNarration } from './ai.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uploads = path.join(root, 'uploads'), outputs = path.join(root, 'outputs');
fs.mkdirSync(uploads, { recursive: true }); fs.mkdirSync(outputs, { recursive: true });
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(x => x.trim());
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)), allowedHeaders: ['Content-Type', 'x-groq-api-key', 'x-gemini-api-key'], methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '2mb' }));
app.use('/media', express.static(uploads, { fallthrough: false, setHeaders: res => res.setHeader('Cache-Control', 'no-store') }));
app.use('/exports', express.static(outputs, { fallthrough: false }));
const maxMb = Number(process.env.MAX_UPLOAD_MB || 500);
const allowed = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);
const storage = multer.diskStorage({ destination: uploads, filename: (_req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()) });
const upload = multer({ storage, limits: { fileSize: maxMb * 1024 * 1024 }, fileFilter: (_req, file, cb) => allowed.has(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('MP4, MOV, M4V, WEBM သို့မဟုတ် MKV ဖိုင်သာ တင်ပါ။')) });

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'ConerZone AI Movie Recap Studio', ai: ['Groq', 'Gemini'], ffmpeg: 'server-installed-required' }));
app.post('/api/ai/test', async (req, res) => {
  const wants = z.object({ groq: z.boolean().optional(), gemini: z.boolean().optional() }).safeParse(req.body || {});
  if (!wants.success || (!wants.data.groq && !wants.data.gemini)) return res.status(400).json({ error: 'Groq သို့မဟုတ် Gemini API Key အနည်းဆုံးတစ်ခု ထည့်ပါ။' });
  const results = [];
  try {
    if (wants.data.groq) { await testGroq(req.get('x-groq-api-key')); results.push('Groq OK'); }
    if (wants.data.gemini) { await testGemini(req.get('x-gemini-api-key')); results.push('Gemini OK'); }
    res.json({ ok: true, message: results.join(' · ') });
  } catch (e) { res.status(502).json({ error: 'API connection မအောင်မြင်ပါ: ' + (e.message || 'Provider error') }); }
});
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video file မတွေ့ပါ။' });
  res.json({ filename: req.file.filename, name: req.file.originalname, url: '/media/' + encodeURIComponent(req.file.filename), size: req.file.size });
});
function isPublicHttpUrl(value) {
  let u;
  try { u = new URL(value); } catch { return false; }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h === '::1' || h.endsWith('.local') || h === '0.0.0.0' || h.startsWith('10.') || h.startsWith('127.') || h.startsWith('192.168.') || h.startsWith('169.254.') || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}
app.post('/api/import-url', async (req, res) => {
  const parsed = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!parsed.success || !isPublicHttpUrl(parsed.data.url)) return res.status(400).json({ error: 'Public HTTP/HTTPS direct video URL သာ လက်ခံပါတယ်။' });
  const u = new URL(parsed.data.url), ext = path.extname(u.pathname).toLowerCase();
  if (!allowed.has(ext)) return res.status(400).json({ error: 'URL သည် direct video file (.mp4/.mov/.webm/.mkv) ဖြစ်ရပါမယ်။ Streaming page URL မရပါ။' });
  const name = randomUUID() + ext, dest = path.join(uploads, name);
  try {
    const response = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(120000) });
    if (!response.ok || !response.body) throw new Error('HTTP ' + response.status);
    const writer = fs.createWriteStream(dest); let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > maxMb * 1024 * 1024) { writer.destroy(); throw new Error('Video သည် ' + maxMb + 'MB ထက်ကြီးနေပါတယ်။'); }
      if (!writer.write(chunk)) await new Promise((resolve, reject) => { writer.once('drain', resolve); writer.once('error', reject); });
    }
    writer.end(); await new Promise((resolve, reject) => { writer.once('finish', resolve); writer.once('error', reject); });
    res.json({ filename: name, name: path.basename(u.pathname), url: '/media/' + encodeURIComponent(name), size: total });
  } catch (e) { fs.rmSync(dest, { force: true }); res.status(400).json({ error: 'Video URL မှ download မအောင်မြင်ပါ။ Direct downloadable URL ကို စစ်ပါ။ ' + e.message }); }
});

function runProcess(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    const stdout = [], stderr = [];
    child.stdout.on('data', d => stdout.push(d));
    child.stderr.on('data', d => stderr.push(d));
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({ stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr).toString('utf8') }) : reject(new Error(Buffer.concat(stderr).toString('utf8').slice(-1200) || command + ' failed (' + code + ')')));
  });
}
app.post('/api/analyze-movie', async (req, res) => {
  const parsed = z.object({ filename: z.string().regex(/^[a-f0-9-]+\.(mp4|mov|m4v|webm|mkv)$/i), sampleLimit: z.number().int().min(4).max(24).default(12) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Video filename မမှန်ပါ။' });
  const source = path.join(uploads, path.basename(parsed.data.filename));
  if (!fs.existsSync(source)) return res.status(404).json({ error: 'Video ဖိုင်မတွေ့ပါ။ Backend ဆီ upload အရင်လုပ်ပါ။' });
  try {
    const probe = await runProcess('ffprobe', ['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',source]);
    const meta = JSON.parse(probe.stdout.toString('utf8') || '{}');
    const duration = Number(meta.format?.duration || 0);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Video duration မဖတ်နိုင်ပါ။');
    // Scene detection returns timestamp candidates. Cap samples so long films remain manageable.
    const detect = await runProcess('ffmpeg', ['-hide_banner','-i',source,'-vf','scdet=t=12','-an','-f','null','-']);
    const cutTimes = [...detect.stderr.matchAll(/lavfi\.scd\.time:\s*([0-9.]+)/g)].map(m=>Number(m[1])).filter(n=>n>0 && n<duration);
    const interval = duration / Math.max(3, parsed.data.sampleLimit - 1);
    const candidates = [0, ...cutTimes, ...Array.from({length: parsed.data.sampleLimit - 1},(_,i)=>(i+1)*interval)]
      .filter(n=>Number.isFinite(n) && n>=0 && n<duration).sort((a,b)=>a-b);
    const times = [];
    for (const t of candidates) if (!times.some(x=>Math.abs(x-t)<Math.max(3, duration/parsed.data.sampleLimit/2))) times.push(t);
    const chosen = times.slice(0, parsed.data.sampleLimit);
    const frames = [];
    for (let i=0;i<chosen.length;i++) {
      const t=chosen[i];
      const shot=await runProcess('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(t),'-i',source,'-frames:v','1','-vf','scale=512:-1','-q:v','5','-f','image2pipe','-vcodec','mjpeg','pipe:1']);
      if (shot.stdout.length) frames.push({index:i,time:Number(t.toFixed(2)),base64:shot.stdout.toString('base64')});
    }
    if (!frames.length) throw new Error('Keyframe မထုတ်နိုင်ပါ။ Video codec ကို စစ်ပါ။');
    const descriptions = await describeMovieFrames(frames, req.get('x-gemini-api-key'));
    const scenes = frames.map(f => {
      const d=Array.isArray(descriptions)?descriptions.find(x=>Number(x.index)===f.index):null;
      return { index:f.index, start:f.time, end:Number(Math.min(duration, f.time + Math.max(3, interval)).toFixed(2)), description:d?.description || 'Gemini မှ ဖော်ပြချက်မရပါ', mood:d?.mood || '', visible_action:d?.visible_action || '' };
    });
    res.json({ ok:true, filename:parsed.data.filename, duration:Number(duration.toFixed(2)), width:meta.streams?.find(s=>s.codec_type==='video')?.width || null, height:meta.streams?.find(s=>s.codec_type==='video')?.height || null, sceneCount:cutTimes.length, sampled:scenes.length, scenes });
  } catch(e) { res.status(502).json({ error:'Movie analysis မအောင်မြင်ပါ: '+(e.message||'FFmpeg/Gemini error') }); }
});
app.post('/api/ai/scene-plan', async (req, res) => {
  const parsed = z.object({ script:z.string().min(1).max(18000), scenes:z.array(z.object({index:z.number().int(),start:z.number(),end:z.number(),description:z.string().max(1000),mood:z.string().optional(),visible_action:z.string().optional()})).min(1).max(24), targetDuration:z.number().int().min(30).max(7200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error:'Narration နဲ့ Scene အချက်အလက် မပြည့်စုံပါ။' });
  try {
    const plan=await matchScenesToNarration(parsed.data.script,parsed.data.scenes,parsed.data.targetDuration,req.get('x-gemini-api-key'));
    const selections=Array.isArray(plan.selections)?plan.selections:[];
    const valid=selections.filter(s=>Number.isInteger(s.sceneIndex)&&parsed.data.scenes.some(x=>x.index===s.sceneIndex));
    res.json({ok:true,selections:valid});
  } catch(e) { res.status(502).json({error:'Scene plan မဖန်တီးနိုင်ပါ: '+(e.message||'Gemini error')}); }
});

app.post('/api/ai/recap', async (req, res) => {
  const parsed = z.object({ title: z.string().max(200).optional(), language: z.string().max(40).optional(), duration: z.string().max(40).optional(), notes: z.string().max(12000).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Input မမှန်ပါ။' });
  try { res.json({ provider: 'Groq', text: await generateRecap(parsed.data, req.get('x-groq-api-key')) }); } catch (e) { res.status(502).json({ error: e.message || 'Groq API request မအောင်မြင်ပါ။' }); }
});
app.post('/api/ai/subtitle', async (req, res) => {
  const parsed = z.object({ text: z.string().min(1).max(12000), targetLanguage: z.string().max(40).optional(), task: z.enum(['proofread', 'translate', 'simplify']).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Subtitle text ထည့်ပါ။' });
  try { res.json({ provider: 'Gemini', text: await cleanSubtitle(parsed.data, req.get('x-gemini-api-key')) }); } catch (e) { res.status(502).json({ error: e.message || 'Gemini API request မအောင်မြင်ပါ။' }); }
});
app.post('/api/tts', async (req, res) => {
  const parsed = z.object({ text: z.string().min(1).max(20000), gender: z.enum(['male', 'female', 'auto']).default('female') }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'အသံထုတ်ရန် စာသားထည့်ပါ (အများဆုံး စာလုံး 20,000)။' });
  const voice = parsed.data.gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';
  const outName = randomUUID() + '.mp3';
  const outPath = path.join(outputs, outName);
  const child = spawn(process.env.PYTHON_BIN || 'python3', ['-m', 'edge_tts', '--voice', voice, '--text', parsed.data.text, '--write-media', outPath], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', d => { stderr = (stderr + d.toString()).slice(-4000); });
  child.on('error', e => { fs.rmSync(outPath, { force: true }); if (!res.headersSent) res.status(500).json({ error: 'TTS runtime မရပါ။ Docker image ထဲမှာ Python နှင့် edge-tts install လုပ်ပါ။ ' + e.message }); });
  child.on('close', code => {
    if (res.headersSent) return;
    if (code !== 0 || !fs.existsSync(outPath) || fs.statSync(outPath).size === 0) { fs.rmSync(outPath, { force: true }); return res.status(502).json({ error: 'မြန်မာအသံထုတ်မရပါ။ Internet/TTS service ကိုစစ်ပါ။ ' + stderr.slice(-1200) }); }
    res.json({ ok: true, voice, filename: outName, url: '/exports/' + outName });
  });
});
app.post('/api/export', async (req, res) => {
  const parsed = z.object({ filename: z.string().regex(/^[a-f0-9-]+\.(mp4|mov|m4v|webm|mkv)$/i), srt: z.string().min(1).max(500000), audioFilename: z.string().regex(/^[a-f0-9-]+\.mp3$/i).optional(), fontSize: z.number().int().min(12).max(72).default(28), marginV: z.number().int().min(0).max(500).default(40) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Export input မမှန်ပါ။' });
  const source = path.join(uploads, path.basename(parsed.data.filename));
  if (!fs.existsSync(source)) return res.status(404).json({ error: 'Video ဖိုင်မတွေ့ပါ။' });
  const outName = randomUUID() + '.mp4', outPath = path.join(outputs, outName), srtPath = path.join(os.tmpdir(), randomUUID() + '.srt');
  fs.writeFileSync(srtPath, parsed.data.srt, 'utf8');
  const safeSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const audioPath = parsed.data.audioFilename ? path.join(outputs, path.basename(parsed.data.audioFilename)) : null;
  if (parsed.data.audioFilename && !fs.existsSync(audioPath)) { fs.rmSync(srtPath, { force: true }); return res.status(404).json({ error: 'TTS audio file မတွေ့ပါ။' }); }
  const args = ['-y', ...(audioPath ? ['-stream_loop', '-1'] : []), '-i', source, ...(audioPath ? ['-i', audioPath, '-map', '0:v:0', '-map', '1:a:0'] : []), '-vf', "subtitles='" + safeSrt + "':force_style='FontName=Noto Sans Myanmar,FontSize=" + parsed.data.fontSize + ',Outline=1,Shadow=0,MarginV=' + parsed.data.marginV + ",Alignment=2'", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', ...(audioPath ? ['-shortest'] : []), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outPath];
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] }); let stderr = '';
  child.stderr.on('data', d => { stderr = (stderr + d.toString()).slice(-5000); });
  child.on('error', e => { fs.rmSync(srtPath, { force: true }); if (!res.headersSent) res.status(500).json({ error: 'Backend တွင် FFmpeg install လုပ်ထားရန်လိုသည်။ ' + e.message }); });
  child.on('close', code => { fs.rmSync(srtPath, { force: true }); if (res.headersSent) return; if (code !== 0) return res.status(500).json({ error: 'MP4 export မအောင်မြင်ပါ။ FFmpeg/libass နှင့် Noto Sans Myanmar font စစ်ပါ။ ' + stderr.slice(-1000) }); res.json({ url: '/exports/' + outName, filename: outName }); });
});
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err instanceof multer.MulterError) return res.status(413).json({ error: 'Upload limit ကျော်နေပါတယ်။ အများဆုံး ' + maxMb + 'MB ဖြစ်ပါတယ်။' });
  res.status(500).json({ error: err.message || 'Server error' });
});
const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log('ConerZone API listening on port ' + port));
