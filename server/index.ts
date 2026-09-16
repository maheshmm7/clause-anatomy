import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createAppFromEnv } from './createAppFromEnv.js';

/** Production Node server: serves the built UI and the API from one origin. */
const here = path.dirname(fileURLToPath(import.meta.url));
// Compiled to dist-server/server/index.js → the UI build lives in ../../dist
const staticDir = path.resolve(here, '../../dist');

const { port } = loadConfig(process.env);
const app = createAppFromEnv(process.env, { staticDir });

const server = app.listen(port, () => {
  console.log(`Clause Anatomy running at http://localhost:${port}`);
});

const shutdown = (): void => {
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
