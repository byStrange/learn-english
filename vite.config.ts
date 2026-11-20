/// <reference types="vitest/config" />
import {defineConfig, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The app icon and the web-app manifest live in public/ and are copied to the
 * root of the build. Their <link> tags are added here (not written in
 * index.html), so the source page never points at a file that isn't next to it.
 */
function appIconAndManifest(): Plugin {
  return {
    name: 'app-icon-and-manifest',
    transformIndexHtml(_html, ctx) {
      const base = ctx.server ? '/' : './';
      return [
        {tag: 'link', attrs: {rel: 'icon', type: 'image/svg+xml', href: `${base}icon.svg`}, injectTo: 'head'},
        {tag: 'link', attrs: {rel: 'apple-touch-icon', href: `${base}icon.svg`}, injectTo: 'head'},
        {tag: 'link', attrs: {rel: 'manifest', href: `${base}manifest.webmanifest`}, injectTo: 'head'},
      ];
    },
  };
}

// base './' + a hash router lets the same build run from GitHub Pages
// (https://bystrange.github.io/learn-english/) or any folder.
export default defineConfig({
  base: './',
  plugins: [react(), appIconAndManifest()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    css: false,
    server: {deps: {inline: [/@curialy/]}},
  },
});
