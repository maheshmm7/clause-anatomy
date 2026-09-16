import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['shared/**/*.ts', 'server/**/*.ts', 'src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'src/main.tsx',
        'server/index.ts',
        'src/test/**',
        'server/testing/**',
        'src/samples/**/{en,hi,te,document,skeleton}.ts',
      ],
      reporter: ['text-summary', 'html'],
      thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 },
    },
  },
});
