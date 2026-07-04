import { execFile } from 'child_process';
import { promisify } from 'util';
import { AppError } from './AppError';

const execFileAsync = promisify(execFile);

type ExtractionErrorKeys = {
  pdfExtractionFailed: string;
  ocrFailed: string;
};

export function normalizeExtractedText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractUploadedDocumentText(
  file: Express.Multer.File,
  errorKeys: ExtractionErrorKeys,
) {
  try {
    if (file.mimetype === 'application/pdf') {
      const { stdout } = await execFileAsync('pdftotext', [file.path, '-'], { maxBuffer: 5 * 1024 * 1024 });
      return normalizeExtractedText(String(stdout));
    }

    const { stdout } = await execFileAsync('tesseract', [file.path, 'stdout', '-l', 'spa+eng'], {
      maxBuffer: 5 * 1024 * 1024,
    });
    return normalizeExtractedText(String(stdout));
  } catch {
    if (file.mimetype === 'application/pdf') {
      throw new AppError(errorKeys.pdfExtractionFailed, 422);
    }
    throw new AppError(errorKeys.ocrFailed, 422);
  }
}
