import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { version } from './package.json' with { type: 'json' };

function offlineShell(): Plugin {
  const release = `praesidium-v${version}`;
  return {
    name: 'praesidium-offline-shell',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { name: 'praesidium-release', content: version }, injectTo: 'head' }];
    },
    generateBundle(_options, bundle) {
      const worker = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');
      const publicManifest = readFileSync(new URL('./public/manifest.json', import.meta.url));
      const files = Object.values(bundle).filter(file => file.fileName !== 'sw.js').sort((a, b) => a.fileName.localeCompare(b.fileName));
      const hash = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
      const precache = [
        ['./manifest.json', hash(publicManifest)],
        ...files.map(file => [`./${file.fileName}`, hash(file.type === 'asset' ? file.source : file.code)]),
      ];
      if (!files.some(file => file.fileName === 'index.html')) throw new Error('Offline release is missing its HTML shell');
      const revision = hash(release + worker + JSON.stringify(precache)).slice(0, 16);

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: worker
          .replace("const RELEASE = 'praesidium-development';", `const RELEASE = ${JSON.stringify(release)};`)
          .replace("const REVISION = 'development';", `const REVISION = ${JSON.stringify(revision)};`)
          .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(precache)};`),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineShell()],
  build: {
    target: 'es2020',
    sourcemap: false,
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 5175,
    host: true,
    open: true,
  },
});
