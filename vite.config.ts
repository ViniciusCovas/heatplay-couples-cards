import { defineConfig, loadEnv } from "vite";
import { resolveSupabaseConfig } from "./src/lib/supabaseConfig";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "node:fs";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  // Fail before bundling so a mistakenly supplied server key never enters assets.
  // A fully isolated preview may omit all database configuration.
  if (env.VITE_TABLE_PREVIEW !== 'true' || env.VITE_SUPABASE_URL || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PROJECT_ID) {
    resolveSupabaseConfig(env, { allowLocal: mode === 'development' });
  }
  return ({
  server: {
    host: true,
    port: 8080,
  },
  plugins: [
    react(),
    env.VITE_TABLE_PREVIEW === 'true' && {
      name: 'preview-viewport-review',
      transformIndexHtml() {
        return [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' as const }];
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'review.html', source: readFileSync('tests/viewport.html', 'utf8') });
      },
    },
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Runtime helpers and tiny utilities are shared by the landing and
          // lazy screens. Giving them their own home prevents Rollup 4.24
          // from pulling an entire chart/database chunk into the entry page.
          if (id.includes('commonjsHelpers') || id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill')) {
            return 'vendor-runtime';
          }
          if (/[/\\]node_modules[/\\](clsx|tailwind-merge|class-variance-authority)[/\\]/.test(id)) {
            return 'vendor-ui-utils';
          }
          if (/[/\\]node_modules[/\\](react|react-dom|react-router|react-router-dom|scheduler|react-is)[/\\]/.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('/node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('/node_modules/@tanstack/')) return 'vendor-query';
          if (id.includes('/node_modules/recharts/')) return 'vendor-charts';
          if (/[/\\]node_modules[/\\](i18next|react-i18next|i18next-browser-languagedetector)[/\\]/.test(id)) {
            return 'vendor-i18n';
          }
        },
      },
    },
  },
});
});
