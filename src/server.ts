import express from 'express';
import multer from 'multer';
import path from 'path';
import { HtmlProcessingService } from './services/html-processing-service';
import { evaluateQuality } from './services/quality-validator';
import { logger } from './utils/logger';
import { ProcessingError, isProcessingError } from './utils/error-handler';
import { saveTempFile, removeFileSafe } from './utils/file-manager';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const service = new HtmlProcessingService();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/info', (_req, res) => {
  res.json({
    name: 'HTML to Figma conversion prototype',
    version: '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
  });
});

app.post('/render-html-text', async (req, res, next) => {
  try {
    const { htmlContent, filename, options } = req.body;
    const result = await service.process({ htmlContent, filename, options });
    const quality = evaluateQuality(result.nodes);

    res.json({
      ...result,
      quality,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/render-html-file', upload.single('htmlFile'), async (req, res, next) => {
  if (!req.file) {
    next(new ProcessingError('htmlFile field is required', 'BAD_REQUEST'));
    return;
  }

  let tempPath: string | undefined;
  try {
    tempPath = await saveTempFile(req.file.buffer, path.extname(req.file.originalname) || '.html');
    const htmlContent = req.file.buffer.toString('utf-8');
    const result = await service.process({ htmlContent, filename: req.file.originalname });
    const quality = evaluateQuality(result.nodes);

    res.json({
      ...result,
      quality,
      meta: {
        ...result.meta,
        upload: {
          filename: req.file.originalname,
          size: req.file.size,
          tempPath,
        },
      },
    });
  } catch (error) {
    next(error);
  } finally {
    await removeFileSafe(tempPath);
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (isProcessingError(err)) {
    logger.warn('Client error', { message: err.message, code: err.code, details: err.details });
    res.status(err.code === 'BAD_REQUEST' ? 400 : 422).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  logger.error('Unhandled error', { error: err });
  res.status(500).json({ error: 'Internal Server Error' });
});

const port = Number(process.env.PORT) || 4000;

export const start = () => {
  app.listen(port, () => {
    logger.info(`Server listening on http://localhost:${port}`);
  });
};

if (require.main === module) {
  start();
}




