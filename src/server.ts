import express from 'express';
import path from 'path';
import { runPipeline } from './pipeline';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const publicPath = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(express.static(publicPath));

app.post('/generate', (req, res) => {
  const prompt = String(req.body.prompt || '');
  if (!prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const result = runPipeline(prompt);
  res.json(result);
});

app.get('/health', (_, res) => {
  res.json({ ok: true, name: 'AI Compiler Demo' });
});

// Only listen if this file is run directly (not when imported by Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`AI compiler demo available at http://localhost:${port}`);
  });
}

export default app;
