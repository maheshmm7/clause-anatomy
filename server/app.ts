import compression from 'compression';
import express, { type Express, type Request } from 'express';
import {
  analyzeRequestSchema,
  askRequestSchema,
  extractRequestSchema,
  type AnalyzeRequest,
  type AskRequest,
  type ExtractRequest,
  type HealthResult,
} from '../shared/schema.js';
import type { AiClient } from './ai/types.js';
import { HttpError } from './lib/httpError.js';
import {
  aiRateLimit,
  errorHandler,
  noStore,
  notFound,
  permissionsPolicy,
  securityHeaders,
  validateBody,
} from './middleware/http.js';
import { createDocumentServices } from './services/documentServices.js';

export interface AppOptions {
  /** `null` when no API key is configured: the UI still works with the built-in examples. */
  ai: AiClient | null;
  rateLimitMax: number;
  /** Folder with the built front-end to serve (production only). */
  staticDir?: string;
  logger?: Pick<Console, 'error'>;
}

/** Body size caps per route: photos need more room than text. */
const JSON_LIMIT = { text: '512kb', upload: '4.2mb' } as const;

/**
 * Builds the Express application. All dependencies are injected so the exact same
 * app runs in tests (fake AI), local development, a Node server and serverless hosts.
 */
export function createApp({ ai, rateLimitMax, staticDir, logger }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  // Behind one proxy hop (Vercel, Render, Cloud Run…) so rate limiting sees the real client IP.
  app.set('trust proxy', 1);

  app.use(securityHeaders());
  app.use(permissionsPolicy);
  app.use(compression());

  const api = express.Router();
  api.use(noStore);

  api.get('/health', (_req, res) => {
    const body: HealthResult = { status: 'ok', aiAvailable: ai !== null };
    res.json(body);
  });

  const services = ai ? createDocumentServices({ ai }) : null;
  const requireAi = (): NonNullable<typeof services> => {
    if (!services) {
      throw new HttpError(503, 'ai_unavailable', 'AI analysis is not configured on this server.');
    }
    return services;
  };
  const limiter = aiRateLimit(rateLimitMax);

  api.post(
    '/analyze',
    limiter,
    express.json({ limit: JSON_LIMIT.text }),
    validateBody(analyzeRequestSchema),
    async (req: Request<unknown, unknown, AnalyzeRequest>, res) => {
      res.json(await requireAi().analyze(req.body));
    },
  );

  api.post(
    '/ask',
    limiter,
    express.json({ limit: JSON_LIMIT.text }),
    validateBody(askRequestSchema),
    async (req: Request<unknown, unknown, AskRequest>, res) => {
      res.json(await requireAi().answer(req.body));
    },
  );

  api.post(
    '/extract',
    limiter,
    express.json({ limit: JSON_LIMIT.upload }),
    validateBody(extractRequestSchema),
    async (req: Request<unknown, unknown, ExtractRequest>, res) => {
      res.json(await requireAi().extract(req.body));
    },
  );

  api.use(notFound);
  app.use('/api', api);

  if (staticDir) {
    app.use(
      express.static(staticDir, {
        index: false,
        setHeaders: (res, filePath) => {
          // Hashed build assets never change; the HTML shell must always be fresh.
          const immutable = /[\\/]assets[\\/]/.test(filePath);
          res.setHeader(
            'Cache-Control',
            immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
          );
        },
      }),
    );
    app.get('/{*path}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile('index.html', { root: staticDir });
    });
  }

  app.use(errorHandler(logger));
  return app;
}
