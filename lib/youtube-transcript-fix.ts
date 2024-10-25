// https://github.com/Kakulukian/youtube-transcript/issues/19
import { parse } from 'node-html-parser';
// const { parse } = require("node-html-parser")

const RE_YOUTUBE =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`);
  }
}


/**
 * Class to retrieve transcript if exist
 */
class YoutubeTranscript {
  /**
   * Fetch transcript from YTB Video
   * @param videoId Video url or video identifier
   * @param config Object with lang param (eg: en, es, hk, uk) format.
   * Will just the grab first caption if it can find one, so no special lang caption support.
   */
  static async fetchTranscript(videoId: string) {
    const identifier = this.retrieveVideoId(videoId);
    // const lang = config?.lang ?? 'en';
    const lang = 'pt'; // Forçando parâmetro lang para pt
    console.log({ identifier });
    try {
      const transcriptUrl = await fetch(
        `https://www.youtube.com/watch?v=${identifier}&key=${process.env.NEXT_APP_GOOGLE_API_KEY}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Cookie': 'CONSENT=YES+; PATH=/; DOMAIN=.youtube.com',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          },
        }
      )
        .then((res) => res.text())
        .then((html) => {
          const parsedHTML = parse(html)
          console.log(`[YoutubeTranscript] Parsed Document Structure: ${parsedHTML.structure}`);
          return parsedHTML
        })
        .then((html) => parseTranscriptEndpoint(html, lang))
        .catch((error) => console.error(error))

      console.log(`[YoutubeTranscript] transcriptUrl: ${transcriptUrl}`);

      if (!transcriptUrl)
        throw new Error('Failed to locate a transcript for this video!');

      // Result is hopefully some XML.
      const transcriptXML = await fetch(transcriptUrl)
        .then((res) => res.text())
        .then((xml) => parse(xml));

      const chunks = transcriptXML.getElementsByTagName('text');

      const convertToMs = (text: string) => {
        const float = parseFloat(text.split('=')[1].replace(/"/g, '')) * 1000;
        return Math.round(float);
      };

      const transcriptions = [];
      for (const chunk of chunks) {
        const [offset, duration] = chunk.rawAttrs.split(' ');
        transcriptions.push({
          text: chunk.text,
          offset: convertToMs(offset),
          duration: convertToMs(duration),
        });
      }
      return transcriptions;
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new YoutubeTranscriptError(e.message);
      }
      throw new YoutubeTranscriptError('Erro desconhecido');
    }
  }

  /**
   * Retrieve video id from url or string
   * @param videoId video url or video id
   */
  static retrieveVideoId(videoId: string) {
    if (videoId.length === 11) {
      return videoId;
    }
    const matchId = videoId.match(RE_YOUTUBE);
    if (matchId && matchId.length) {
      return matchId[1];
    }
    throw new YoutubeTranscriptError(
      'Impossible to retrieve Youtube video ID.'
    );
  }
}

interface ScriptElement {
  textContent: string;
}

interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
}

interface YTPlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks: CaptionTrack[];
    };
  };
}

const parseTranscriptEndpoint = (document: ReturnType<typeof parse>, langCode?: string) => {
  try {
    const scripts = document.getElementsByTagName('script');
    const playerScript = scripts.find((script: ScriptElement) =>
      script.textContent.includes('var ytInitialPlayerResponse = {')
    );

    if (!playerScript) {
      throw new Error('Failed to find player script');
    }

    const dataString =
      playerScript.textContent
        ?.split('var ytInitialPlayerResponse = ')?.[1] //get the start of the object {....
        ?.split('};')?.[0] + // chunk off any code after object closure.
      '}'; // add back that curly brace we just cut.

    const data = JSON.parse(dataString.trim()) as YTPlayerResponse;
    
    const availableCaptions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    let captionTrack = availableCaptions?.[0];
    if (langCode)
      captionTrack = availableCaptions.find((track: CaptionTrack) =>
        track.languageCode.includes(langCode)
      ) ?? availableCaptions?.[0];

    return captionTrack?.baseUrl;
  } catch (error: unknown) {
    console.error(error);
    console.error(`YoutubeTranscript.#parseTranscriptEndpoint ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

YoutubeTranscript.fetchTranscript("https://www.youtube.com/watch?v=3TiDAWmkhts")
  .then(req => console.log(req))
  .catch(e => console.error(e))

export { YoutubeTranscript, YoutubeTranscriptError };
// module.exports = { YoutubeTranscript, YoutubeTranscriptError };
