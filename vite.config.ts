import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI components library
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-accordion',
            '@radix-ui/react-collapsible',
          ],
          // Charting (heavy, only used on some pages)
          'vendor-charts': ['recharts'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Query/state management
          'vendor-query': ['@tanstack/react-query'],
          // DnD (only for Kanban views)
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Virtual scrolling
          'vendor-virtual': ['@tanstack/react-virtual'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Use explicit prompt so we can flush pending writes BEFORE reloading.
      // autoUpdate would silently swap the SW and could lose in-flight drafts.
      registerType: "prompt",
      filename: "app-sw.js",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id: "low-battery-business-planner",
        name: "Low Battery Business Planner",
        short_name: "Low Battery",
        description: "Low Battery Business Planner — your 25% still counts.",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#FAF7F2",
        theme_color: "#E87B93",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        categories: ["productivity", "business"],
        shortcuts: [
          {
            name: "Quick Capture",
            short_name: "Capture",
            description: "Quickly capture a task or idea",
            url: "/capture",
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View your dashboard",
            url: "/dashboard",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        cleanupOutdatedCaches: true,
        // NOTE: skipWaiting / clientsClaim are intentionally OFF.
        // The single update model is "prompt": the new service worker waits
        // until the user accepts in PWAUpdatePrompt, which flushes pending
        // writes first and then calls updateServiceWorker(true).
        navigateFallbackDenylist: [/^\/~oauth/, /^\/~flock/],
        // Cache app shell first
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 3,
            },
          },
          // Cache fonts (public, no auth - safe to cache)
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // SECURITY: Do NOT cache Supabase API responses in service worker
          // Service worker caches are shared per browser profile, which can
          // cause cross-user data leakage on shared devices.
          // Use IndexedDB (offlineDb.ts) for per-user offline caching instead.
          // Cache images (static assets - safe to cache)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
