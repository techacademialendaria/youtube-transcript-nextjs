import express from 'express';
import { YoutubeTranscript } from './youtube-transcript-fix';

const app = express();
const port = 8080;

app.use(express.json());

app.post('/transcribe', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL do vídeo não fornecida' });
  }

  try {
    const transcriptions = await YoutubeTranscript.fetchTranscript(url);
    console.log(transcriptions)
    res.json({ transcriptions });
  } catch (error) {
    console.error('Erro ao transcrever o vídeo:', error);
    res.status(500).json({ error: 'Erro ao transcrever o vídeo' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});