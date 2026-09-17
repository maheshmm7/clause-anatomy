import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import type { createAppFromEnv as CreateAppFromEnv } from './server/createAppFromEnv';

/**
 * Mounts the Express API inside the Vite dev server so `npm run dev` runs the whole
 * app (UI + API) from one command, on one origin, exactly like production.
 */
function devApi(mode: string): Plugin {
  return {
    name: 'clause-anatomy-dev-api',
    apply: 'serve',
    async configureServer(server) {
      const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
      const module = (await server.ssrLoadModule('/server/createAppFromEnv.ts')) as {
        createAppFromEnv: typeof CreateAppFromEnv;
      };
      const app = module.createAppFromEnv(env);
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(mode)],
  build: {
    target: 'es2022',
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Everything the first screen needs goes into one chunk, instead of a dozen tiny
          // shared chunks that each cost a round trip on slow mobile networks. Sections,
          // examples, pdf.js and schema validation still load on demand.
          groups: [{ name: 'app', tags: ['$initial'] }],
        },
      },
    },
  },
}));
