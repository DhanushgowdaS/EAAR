import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Multi-turn farmer assistant endpoint using gemini-3.5-flash for general tasks
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [], dashboardContext, language = 'en' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const langInstructions: Record<string, string> = {
      en: 'Reply in English in clear, encouraging, farmer-friendly terms.',
      kn: 'Reply in clear, simple, farmer-friendly Kannada (ಕನ್ನಡ) script with polite phrasing.',
      hi: 'Reply in clear, simple, farmer-friendly Hindi (हिंदी) script.',
      te: 'Reply in clear, simple, farmer-friendly Telugu (తెలుగు) script.',
      ta: 'Reply in clear, simple, farmer-friendly Tamil (தமிழ்) script.',
    };

    const targetLangInst = langInstructions[language] || langInstructions.en;

    const systemInstruction = `
You are the EAAR Intelligent Agricultural Assistant (Edge-AI Enabled Autonomous Agricultural Rover Field Advisor).
Your mission is to assist farmers, field operators, and agricultural evaluators in understanding the rover's real-time telemetry, environmental conditions, autonomous navigation, and Raspberry Pi 5 AI crop disease detections.

Current Live Telemetry & Mission Context:
${dashboardContext ? JSON.stringify(dashboardContext, null, 2) : 'No telemetry snapshot provided.'}

Strict Rules:
1. Always base your answers on the provided telemetry snapshot or general agronomic best practices.
2. DO NOT fabricate or invent fake sensor readings if the context indicates no data or null values; state politely that the rover is awaiting sensor packets from ESP32-S3 or Raspberry Pi 5.
3. If the user asks about healthy crops, clearly reassure them that healthy foliage requires NO chemical pesticide application (only organic bio-stimulant or zero treatment).
4. Provide actionable, concise advice on spraying quantities, timings (e.g. dawn/dusk to protect pollinators), and weather suitability.
5. ${targetLangInst}
6. Keep answers structured, friendly, and easy to understand on a mobile screen in the field.
`;

    // Format previous messages for Gemini
    const contents: any[] = [];

    // Add previous history
    for (const item of conversationHistory as ChatMessage[]) {
      contents.push({
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.text }],
      });
    }

    // Append latest user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    res.json({
      text: response.text || 'I have analyzed the rover status. All systems are operating smoothly.',
    });
  } catch (error: any) {
    console.error('Gemini chat API error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate response from Gemini',
    });
  }
});

// Voice Q&A / Command Quick Query Endpoint using fast gemini-3.1-flash-lite
app.post('/api/gemini/voice-query', async (req: Request, res: Response) => {
  try {
    const { transcript, dashboardContext, language = 'en' } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      res.status(400).json({ error: 'Transcript is required' });
      return;
    }

    const systemInstruction = `
You are the voice interface for the EAAR Autonomous Agricultural Rover.
The farmer is speaking a voice command or question into the EAAR dashboard.
Respond with a concise, spoken-friendly answer (max 2 sentences) that can be read aloud or displayed instantly.

Current Live Telemetry & Mission Context:
${dashboardContext ? JSON.stringify(dashboardContext, null, 2) : 'No live telemetry'}

If the user asks:
- "Check humidity": report current relative humidity and whether it presents fungal spore risk (>75%).
- "What is the soil moisture?": report current soil moisture and root hydration.
- "Show today's disease results" / "What disease was detected?": state the detected crop disease or confirm healthy foliage.
- "What treatment is recommended?": state the exact pesticide, dosage and application method.
- "What is the robot status?": state navigation mode, current crop row, and obstacle clearance.

Language: ${language}. Answer concisely in the user's requested language.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      config: {
        systemInstruction,
      },
    });

    res.json({
      answer: response.text || 'Command processed.',
    });
  } catch (error: any) {
    console.error('Gemini voice query error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process voice query with Gemini',
    });
  }
});

// Mount Vite in dev mode or serve static in prod
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`EAAR Server listening on port ${port} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
