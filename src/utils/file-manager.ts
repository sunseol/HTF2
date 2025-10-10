import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const saveTempFile = async (buffer: Buffer, extension = '.tmp'): Promise<string> => {
  const tempDir = path.join(UPLOAD_ROOT, 'temp');
  await ensureDir(tempDir);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, buffer);
  logger.debug('Saved temp file', { filePath });
  return filePath;
};

export const saveScreenshot = async (buffer: Buffer, extension = '.png'): Promise<string> => {
  const screenshotDir = path.join(UPLOAD_ROOT, 'screenshots');
  await ensureDir(screenshotDir);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(screenshotDir, fileName);
  await fs.writeFile(filePath, buffer);
  logger.info('Stored screenshot artifact', { filePath });
  return filePath;
};

export const removeFileSafe = async (filePath?: string): Promise<void> => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
    logger.debug('Removed file', { filePath });
  } catch (error) {
    logger.warn('Failed to remove file', { filePath, error });
  }
};
