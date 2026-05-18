import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { spawn, execSync, ChildProcessWithoutNullStreams } from 'child_process';
import extractZip from 'extract-zip';

const MODELS_DIR = path.join(__dirname, '../../models');
const PIPER_DIR = path.join(MODELS_DIR, 'piper');

const IS_WINDOWS = os.platform() === 'win32';

const PIPER_ARCHIVE_URL = IS_WINDOWS
  ? 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip'
  : 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz';

const PIPER_BIN = path.join(PIPER_DIR, IS_WINDOWS ? 'piper.exe' : 'piper');

const VOICE_MODELS = {
  es: {
    onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_MX/ald/medium/es_MX-ald-medium.onnx',
    json: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_MX/ald/medium/es_MX-ald-medium.onnx.json',
    filename: 'es_MX-ald-medium.onnx'
  },
  en: {
    onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
    json: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json',
    filename: 'en_US-lessac-medium.onnx'
  }
};

export const initializeVoiceModels = async () => {
  try {
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    // Download Piper
    if (!fs.existsSync(PIPER_BIN)) {
      console.log('[VoiceService] Downloading Piper TTS...');
      const archiveExt = IS_WINDOWS ? 'piper.zip' : 'piper.tar.gz';
      const archivePath = path.join(MODELS_DIR, archiveExt);
      await downloadFile(PIPER_ARCHIVE_URL, archivePath);
      console.log('[VoiceService] Extracting Piper TTS...');

      if (IS_WINDOWS) {
        await extractZip(archivePath, { dir: MODELS_DIR });
      } else {
        // tar.gz extraction for Linux
        execSync(`tar -xzf "${archivePath}" -C "${MODELS_DIR}"`);
        // Set execute permission on the piper binary
        execSync(`chmod +x "${PIPER_BIN}"`);
      }

      fs.unlinkSync(archivePath); // Clean up archive
    }

    // Download Models
    for (const [lang, urls] of Object.entries(VOICE_MODELS)) {
      const onnxPath = path.join(PIPER_DIR, urls.filename);
      const jsonPath = path.join(PIPER_DIR, urls.filename + '.json');

      if (!fs.existsSync(onnxPath)) {
        console.log(`[VoiceService] Downloading ${lang} ONNX model...`);
        await downloadFile(urls.onnx, onnxPath);
      }
      if (!fs.existsSync(jsonPath)) {
        console.log(`[VoiceService] Downloading ${lang} ONNX JSON...`);
        await downloadFile(urls.json, jsonPath);
      }
    }

    console.log('[VoiceService] Piper TTS and models are ready.');
  } catch (error: any) {
    console.error('[VoiceService] Error during voice model initialization:', error);
    // Do not throw the error to prevent app startup crash
  }
};

const downloadFile = (url: string, dest: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const request = require('https').get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (response: any) => {
      // Handle redirects (GitHub/HuggingFace redirects to S3/CDN)
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        let redirectUrl = response.headers.location;
        if (redirectUrl) {
          // If the redirect URL is relative, resolve it using the original URL's origin
          if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
            const parsedOriginal = new URL(url);
            redirectUrl = new URL(redirectUrl, parsedOriginal.origin).toString();
          }
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        } else {
          reject(new Error(`Redirect status ${response.statusCode} but no Location header`));
        }
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (Status Code: ${response.statusCode})`));
        return;
      }

      // Open the write stream ONLY after confirming a successful 200 OK response
      const file = fs.createWriteStream(dest);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(true);
      });

      response.on('error', (err: any) => {
        file.close();
        try { fs.unlinkSync(dest); } catch (_) {}
        reject(err);
      });

      file.on('error', (err: any) => {
        file.close();
        try { fs.unlinkSync(dest); } catch (_) {}
        reject(err);
      });
    });

    request.on('error', (err: any) => {
      reject(err);
    });

    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Request timed out'));
    });
  });
};

export const spawnPiper = (lang: 'es' | 'en'): ChildProcessWithoutNullStreams => {
  const modelFile = VOICE_MODELS[lang].filename;
  const modelPath = path.join(PIPER_DIR, modelFile);
  
  if (!fs.existsSync(modelPath)) {
      throw new Error(`Model ${modelPath} not found.`);
  }

  return spawn(PIPER_BIN, ['--model', modelPath, '--output_raw']);
};
