import { createAppFromEnv } from '../server/createAppFromEnv.js';

/**
 * Serverless entry point (e.g. Vercel). Static files are served by the host's CDN;
 * this function only handles `/api/*` requests, rewritten here by `vercel.json`.
 */
const app = createAppFromEnv(process.env);

export default app;
