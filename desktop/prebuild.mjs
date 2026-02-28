#!/usr/bin/env node
/**
 * Prepara o bundle do backend para o Electron desktop app
 */
import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build as esbuildBuild } from '../node_modules/esbuild/lib/main.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BUNDLE_DIR = resolve(__dirname, 'backend-bundle');

console.log('📦 Preparando backend bundle para Electron...\n');

// Limpar
if (existsSync(BUNDLE_DIR)) rmSync(BUNDLE_DIR, { recursive: true });
mkdirSync(BUNDLE_DIR, { recursive: true });

// 1. Build frontend
console.log('🔨 Compilando frontend...');
execSync('npm run build', { cwd: resolve(ROOT, 'frontend'), stdio: 'inherit' });

// 2. Bundle backend com esbuild (API JS — cross-plataforma)
console.log('\n⚡ Bundling backend...');
const serverSrc = resolve(ROOT, 'backend', 'server.js');
const bundleOut = resolve(BUNDLE_DIR, 'server.cjs');

try {
  await esbuildBuild({
    entryPoints: [serverSrc],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: bundleOut,
    external: ['pg-native'],
    loader: { '.html': 'text' },
    define: { 'import.meta.url': '_importMetaUrl' },
    banner: { js: "var _importMetaUrl=require('url').pathToFileURL(__filename).href;" },
    logLevel: 'info',
  });
} catch (e) {
  console.error('❌ Erro no bundle:', e.message);
  process.exit(1);
}

// 3. Copiar .env
const envSrc = resolve(ROOT, 'backend', '.env');
if (existsSync(envSrc)) {
  cpSync(envSrc, resolve(BUNDLE_DIR, '.env'));
}

// 4. Copiar frontend dist
console.log('📁 Copiando frontend dist...');
mkdirSync(resolve(BUNDLE_DIR, 'public'), { recursive: true });
cpSync(resolve(ROOT, 'frontend', 'dist'), resolve(BUNDLE_DIR, 'public'), { recursive: true });

// 5. Copiar python script de renderização
const pyScript = resolve(ROOT, 'backend', 'news', '_render_script.py');
if (existsSync(pyScript)) {
  mkdirSync(resolve(BUNDLE_DIR, 'news'), { recursive: true });
  cpSync(pyScript, resolve(BUNDLE_DIR, 'news', '_render_script.py'));
}

// 6. Criar package.json mínimo para o bundle
writeFileSync(resolve(BUNDLE_DIR, 'package.json'), JSON.stringify({
  name: "videoforge-backend-bundle",
  version: "1.0.0",
  main: "server.cjs"
}, null, 2));

console.log('\n✅ Backend bundle pronto em:', BUNDLE_DIR);
console.log('   Tamanho:', Math.round(statSync(bundleOut).size / 1024 / 1024), 'MB');
