import { YoutubeTranscript } from '@/lib/youtube-transcript-fix';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL do vídeo não fornecida' },
        { status: 400 }
      );
    }

    const transcriptions = await YoutubeTranscript.fetchTranscript(url);
    return NextResponse.json({ transcriptions });
  } catch (error) {
    console.error('Erro ao transcrever o vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao transcrever o vídeo' },
      { status: 500 }
    );
  }
}
