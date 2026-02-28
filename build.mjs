#!/usr/bin/env node
/**
 * VideoForge Build Script
 * Gera executáveis standalone para Linux e Windows
 */

import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build as esbuildBuild } from './node_modules/esbuild/lib/main.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = resolve(__dirname, 'build');
const DIST_DIR = resolve(__dirname, 'dist');

console.log('🎬 VideoForge Build System');
console.log('==========================\n');

// ============================================
// 1. Limpar diretórios anteriores
// ============================================
console.log('🧹 Limpando builds anteriores...');
if (existsSync(BUILD_DIR)) rmSync(BUILD_DIR, { recursive: true });
if (existsSync(DIST_DIR)) rmSync(DIST_DIR, { recursive: true });
mkdirSync(BUILD_DIR, { recursive: true });
mkdirSync(DIST_DIR, { recursive: true });

// ============================================
// 2. Build do Frontend
// ============================================
console.log('📦 Compilando frontend...');
execSync('npm run build', { cwd: resolve(__dirname, 'frontend'), stdio: 'inherit' });

// ============================================
// 3. Copiar frontend dist para build/public
// ============================================
console.log('📁 Copiando frontend para build/public...');
mkdirSync(resolve(BUILD_DIR, 'public'), { recursive: true });
cpSync(resolve(__dirname, 'frontend', 'dist'), resolve(BUILD_DIR, 'public'), { recursive: true });

// ============================================
// 4. Copiar .env
// ============================================
console.log('📝 Copiando .env...');
const envExamplePath = resolve(__dirname, 'backend', '.env.example');
const envProductionPath = resolve(__dirname, 'backend', '.env.production.example');
if (existsSync(envExamplePath)) {
  cpSync(envExamplePath, resolve(BUILD_DIR, '.env.example'));
} else if (existsSync(envProductionPath)) {
  cpSync(envProductionPath, resolve(BUILD_DIR, '.env.example'));
}
const envPath = resolve(__dirname, 'backend', '.env');
if (existsSync(envPath)) {
  cpSync(envPath, resolve(BUILD_DIR, '.env'));
}

// ============================================
// 5. Copiar scripts Python
// ============================================
console.log('🐍 Copiando scripts Python...');
mkdirSync(resolve(BUILD_DIR, 'news'), { recursive: true });
const pyScript = resolve(__dirname, 'backend', 'news', '_render_script.py');
if (existsSync(pyScript)) {
  cpSync(pyScript, resolve(BUILD_DIR, 'news', '_render_script.py'));
}

// ============================================
// 6. Bundle do backend com esbuild (API JS — cross-plataforma)
// ============================================
console.log('⚡ Bundling backend com esbuild...');

try {
  await esbuildBuild({
    entryPoints: [resolve(__dirname, 'backend', 'server.js')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: resolve(BUILD_DIR, 'server.cjs'),
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

// Verificar se o bundle foi criado
const bundlePath = resolve(BUILD_DIR, 'server.cjs');
if (!existsSync(bundlePath)) {
  console.error('❌ Erro: bundle não foi criado');
  process.exit(1);
}
const sizeMB = Math.round(statSync(bundlePath).size / 1024 / 1024);
console.log(`✅ Bundle criado: ${sizeMB} MB`);

// ============================================
// 7. Criar pkg config
// ============================================
console.log('📋 Configurando pkg...');

const pkgConfig = {
  name: "videoforge",
  version: "1.0.0",
  main: "server.cjs",
  bin: "server.cjs",
  pkg: {
    scripts: ["server.cjs"],
    assets: [
      "public/**/*",
      ".env",
      ".env.example",
      "news/_render_script.py"
    ],
    targets: [
      "node20-linux-x64",
      "node20-win-x64"
    ],
    outputPath: "../dist"
  }
};

writeFileSync(resolve(BUILD_DIR, 'package.json'), JSON.stringify(pkgConfig, null, 2));

// Binário local do pkg
const pkgBin = resolve(__dirname, 'node_modules', '.bin', 'pkg.cmd');
const pkgBinFallback = resolve(__dirname, 'node_modules', '.bin', 'pkg');
const pkgCmd = existsSync(pkgBin) ? `"${pkgBin}"` : `node "${resolve(__dirname, 'node_modules', '@yao-pkg', 'pkg', 'lib-es5', 'bin.js')}"`;

// ============================================
// 8. Gerar executáveis
// ============================================
console.log('\n🔨 Gerando executável Windows...');
try {
  execSync(`${pkgCmd} . --target node20-win-x64 --output ../dist/videoforge-windows.exe --compress GZip`, {
    cwd: BUILD_DIR,
    stdio: 'inherit'
  });
  console.log('✅ Windows: dist/videoforge-windows.exe');
} catch (e) {
  console.error('❌ Erro ao gerar executável Windows:', e.message);
}

console.log('\n🔨 Gerando executável Linux...');
try {
  execSync(`${pkgCmd} . --target node20-linux-x64 --output ../dist/videoforge-linux --compress GZip`, {
    cwd: BUILD_DIR,
    stdio: 'inherit'
  });
  console.log('✅ Linux: dist/videoforge-linux');
} catch (e) {
  console.error('❌ Erro ao gerar executável Linux:', e.message);
}

// ============================================
// 9. Copiar arquivos complementares para dist
// ============================================
console.log('\n📦 Copiando arquivos complementares...');

if (existsSync(resolve(BUILD_DIR, '.env'))) {
  cpSync(resolve(BUILD_DIR, '.env'), resolve(DIST_DIR, '.env'));
}
if (existsSync(resolve(BUILD_DIR, '.env.example'))) {
  cpSync(resolve(BUILD_DIR, '.env.example'), resolve(DIST_DIR, '.env.example'));
}

cpSync(resolve(__dirname, 'docker-compose.yml'), resolve(DIST_DIR, 'docker-compose.yml'));

if (existsSync(resolve(__dirname, 'database'))) {
  cpSync(resolve(__dirname, 'database'), resolve(DIST_DIR, 'database'), { recursive: true });
}

mkdirSync(resolve(DIST_DIR, 'media', 'videos'), { recursive: true });
mkdirSync(resolve(DIST_DIR, 'media', 'audios'), { recursive: true });
mkdirSync(resolve(DIST_DIR, 'media', 'temp'), { recursive: true });

if (existsSync(resolve(__dirname, 'python-worker'))) {
  cpSync(resolve(__dirname, 'python-worker'), resolve(DIST_DIR, 'python-worker'), { recursive: true });
}

writeFileSync(resolve(DIST_DIR, 'README.md'), `# 🎬 VideoForge - Executável Standalone

## Como usar

### 1. Inicie as dependências (PostgreSQL + Python Worker)
\`\`\`bash
docker-compose up -d
\`\`\`

### 2. Configure o .env
Edite o arquivo \`.env\` com suas chaves de API ou use a interface web.

### 3. Execute o VideoForge

**Linux:**
\`\`\`bash
chmod +x videoforge-linux
./videoforge-linux
\`\`\`

**Windows:**
\`\`\`
videoforge-windows.exe
\`\`\`

### 4. Acesse no navegador
Abra: http://localhost:3001
`);

console.log('\n🎉 Build completo!');
console.log('==================');
if (existsSync(resolve(DIST_DIR, 'videoforge-windows.exe'))) console.log('  🪟 dist/videoforge-windows.exe');
if (existsSync(resolve(DIST_DIR, 'videoforge-linux'))) console.log('  🐧 dist/videoforge-linux');
