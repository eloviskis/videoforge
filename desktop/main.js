const { app, BrowserWindow, Menu, Tray, shell, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Configurações
const PORT = 3001;
const APP_NAME = 'VideoForge';
let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;
let detectedMediaDir = null; // Caminho real do volume /media no host

// Caminhos
const isDev = !app.isPackaged;
const appRoot = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'app-data');
const backendDir = path.join(appRoot, 'backend');

// Diretório de dados do usuário (para .env editável e media)
const userDataDir = isDev ? path.join(__dirname, '..') : path.join(app.getPath('userData'), 'videoforge-data');

function ensureUserData() {
  // Criar diretório de dados do usuário
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  
  // Copiar .env se não existe no diretório do usuário
  const userEnv = path.join(userDataDir, '.env');
  const bundledEnv = path.join(backendDir, '.env');
  if (!fs.existsSync(userEnv)) {
    if (fs.existsSync(bundledEnv)) {
      fs.copyFileSync(bundledEnv, userEnv);
    } else {
      // Criar .env básico
      fs.writeFileSync(userEnv, `# VideoForge - Configurações\nPORT=${PORT}\nGEMINI_API_KEY=\nPEXELS_API_KEY=\n`);
    }
  }
  
  // Criar pastas de mídia
  const mediaDirs = ['media/videos', 'media/audios', 'media/temp', 'media/veo_clips'];
  for (const dir of mediaDirs) {
    const fullPath = path.join(userDataDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
  
  console.log(`[VideoForge] Dados do usuário em: ${userDataDir}`);
}

// ============================================
// Gerenciamento do Servidor Backend
// ============================================
function startBackendServer() {
  return new Promise((resolve, reject) => {
    console.log(`[VideoForge] Iniciando backend em: ${backendDir}`);
    console.log(`[VideoForge] appRoot: ${appRoot}`);
    console.log(`[VideoForge] isDev: ${isDev}`);
    
    // Verificar se server.cjs (bundle) ou server.js existe
    let serverFile = path.join(backendDir, 'server.cjs');
    if (!fs.existsSync(serverFile)) {
      serverFile = path.join(backendDir, 'server.js');
    }
    if (!fs.existsSync(serverFile)) {
      reject(new Error(`server não encontrado em ${backendDir}`));
      return;
    }

    console.log(`[VideoForge] Servidor: ${serverFile}`);

    // Usar process.execPath com ELECTRON_RUN_AS_NODE para rodar como Node puro
    // Usar MEDIA_DIR detectado do Docker, ou fallback para userDataDir/media
    const mediaDir = detectedMediaDir || path.join(userDataDir, 'media');
    console.log(`[VideoForge] MEDIA_DIR para backend: ${mediaDir}`);

    serverProcess = spawn(process.execPath, [serverFile], {
      cwd: userDataDir, // cwd = diretório do usuário (onde fica .env e media)
      env: { 
        ...process.env, 
        PORT: String(PORT), 
        ELECTRON_RUN: '1',
        ELECTRON_RUN_AS_NODE: '1',
        MEDIA_DIR: mediaDir
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log(`[Backend] ${msg.trim()}`);
      if (msg.includes('Servidor:') || msg.includes('listening') || msg.includes(`${PORT}`)) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Backend ERR] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      console.error('[Backend] Erro ao iniciar:', err);
      reject(err);
    });

    serverProcess.on('close', (code) => {
      console.log(`[Backend] Processo encerrado com código ${code}`);
      if (!isQuitting) {
        // Reiniciar automaticamente se caiu
        setTimeout(() => startBackendServer(), 2000);
      }
    });

    // Timeout: se não detectou a mensagem de "listening", fazer polling
    setTimeout(() => {
      waitForServer(PORT, 30).then(resolve).catch(reject);
    }, 1000);
  });
}

function waitForServer(port, retries) {
  return new Promise((resolve, reject) => {
    const check = (attempt) => {
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else if (attempt < retries) {
          setTimeout(() => check(attempt + 1), 500);
        } else {
          reject(new Error('Servidor não respondeu'));
        }
      });
      req.on('error', () => {
        if (attempt < retries) {
          setTimeout(() => check(attempt + 1), 500);
        } else {
          reject(new Error('Servidor não disponível'));
        }
      });
      req.setTimeout(2000);
    };
    check(0);
  });
}

function stopBackendServer() {
  if (serverProcess) {
    console.log('[VideoForge] Parando backend...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// ============================================
// Janela Principal
// ============================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: false,
    show: false, // Mostra quando estiver pronto
  });

  // Menu personalizado
  const menuTemplate = [
    {
      label: 'VideoForge',
      submenu: [
        { label: 'Sobre', click: showAbout },
        { type: 'separator' },
        { label: 'Abrir no Navegador', click: () => shell.openExternal(`http://localhost:${PORT}`) },
        { type: 'separator' },
        { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: 'DevTools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => { isQuitting = true; app.quit(); } }
      ]
    },
    {
      label: 'Vídeos',
      submenu: [
        { label: 'Criar Novo Vídeo', click: () => mainWindow.loadURL(`http://localhost:${PORT}`) },
        { label: 'Pasta de Mídia', click: () => shell.openPath(path.join(userDataDir, 'media')) },
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        { label: 'Documentação', click: () => shell.openExternal('https://github.com/videoforge') },
        { label: 'Docker Status', click: checkDocker },
        { type: 'separator' },
        { label: 'Verificar Atualizações', click: () => {
          if (!app.isPackaged) {
            dialog.showMessageBox(mainWindow, { type: 'info', title: 'Dev Mode', message: 'Auto-update desativado em modo desenvolvimento.', buttons: ['OK'] });
            return;
          }
          autoUpdater.checkForUpdates().then((result) => {
            if (!result || !result.updateInfo) {
              dialog.showMessageBox(mainWindow, { type: 'info', title: 'Sem atualizações', message: 'Você já está na versão mais recente!', buttons: ['OK'] });
            }
          }).catch(() => {
            dialog.showMessageBox(mainWindow, { type: 'error', title: 'Erro', message: 'Não foi possível verificar atualizações.\nVerifique sua conexão com a internet.', buttons: ['OK'] });
          });
        }},
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Carregar a URL do frontend
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Mostrar quando estiver pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Minimizar para tray ao fechar
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Abrir links externos no navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ============================================
// System Tray
// ============================================
function createTray() {
  const iconPath = getIconPath();
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: '🎬 VideoForge', enabled: false },
    { type: 'separator' },
    { label: 'Abrir', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Abrir no Navegador', click: () => shell.openExternal(`http://localhost:${PORT}`) },
    { type: 'separator' },
    { label: 'Sair', click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('VideoForge - Criação de vídeos com IA');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ============================================
// Helpers
// ============================================
function getIconPath() {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  return path.join(__dirname, 'assets', iconName);
}

function showAbout() {
  const version = app.getVersion();
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Sobre o VideoForge',
    message: 'VideoForge',
    detail: `Versão ${version}\n\nCriação automática de vídeos com IA\n\nGenai + Pexels + FFmpeg + YouTube\n\nServidor: http://localhost:${PORT}`,
    buttons: ['OK']
  });
}

async function checkDocker() {
  try {
    const output = execSync('docker ps --format "{{.Names}}: {{.Status}}"', { encoding: 'utf-8' });
    const containers = output.trim().split('\n').filter(l => l.includes('videoforge'));
    dialog.showMessageBox(mainWindow, {
      type: containers.length > 0 ? 'info' : 'warning',
      title: 'Status Docker',
      message: containers.length > 0 ? 'Containers ativos:' : 'Nenhum container VideoForge rodando',
      detail: containers.length > 0 ? containers.join('\n') : 'Execute: docker-compose up -d',
      buttons: ['OK']
    });
  } catch (e) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Docker',
      message: 'Docker não encontrado',
      detail: 'Instale o Docker para usar o FFmpeg e PostgreSQL.',
      buttons: ['OK']
    });
  }
}

// ============================================
// Docker Auto-Start
// ============================================
function updateSplash(splash, msg) {
  if (!splash || splash.isDestroyed()) return;
  splash.webContents.executeJavaScript(`
    const p = document.querySelector('p');
    if (p) p.textContent = ${JSON.stringify(msg)};
  `).catch(() => {});
}

async function ensureDockerRunning(splash) {
  // 1. Verificar se Docker já está acessível
  const isDockerRunning = () => {
    try { execSync('docker ps', { stdio: 'pipe', timeout: 5000 }); return true; } catch { return false; }
  };

  if (isDockerRunning()) {
    console.log('[Docker] Já está rodando.');
  } else {
    // 2. Tentar iniciar Docker Desktop
    updateSplash(splash, 'Iniciando Docker Desktop...');
    console.log('[Docker] Iniciando Docker Desktop...');

    const dockerPaths = [
      'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
      process.env.LOCALAPPDATA + '\\Docker\\Docker Desktop.exe',
    ];

    let launched = false;
    for (const p of dockerPaths) {
      if (fs.existsSync(p)) {
        spawn(p, [], { detached: true, stdio: 'ignore' }).unref();
        launched = true;
        console.log(`[Docker] Iniciado: ${p}`);
        break;
      }
    }

    if (!launched) {
      console.warn('[Docker] Docker Desktop não encontrado. Pulando...');
      return;
    }

    // 3. Aguardar até 2 minutos pelo Docker
    updateSplash(splash, 'Aguardando Docker inicializar...');
    const maxWait = 24; // 24 x 5s = 120s
    let ready = false;
    for (let i = 0; i < maxWait; i++) {
      await new Promise(r => setTimeout(r, 5000));
      if (isDockerRunning()) { ready = true; break; }
      const elapsed = (i + 1) * 5;
      updateSplash(splash, `Aguardando Docker... (${elapsed}s)`);
      console.log(`[Docker] Aguardando... (${elapsed}s)`);
    }

    if (!ready) {
      console.warn('[Docker] Docker não respondeu em 2 minutos.');
      return;
    }
    console.log('[Docker] Docker está pronto!');
  }

  // 4. Subir containers do VideoForge
  const composePath = path.join(app.isPackaged ? path.join(process.resourcesPath, 'app-data') : path.join(__dirname, '..'), 'docker-compose.yml');
  if (!fs.existsSync(composePath)) {
    console.warn('[Docker] docker-compose.yml não encontrado em:', composePath);
    return;
  }

  updateSplash(splash, 'Iniciando containers VideoForge...');
  console.log('[Docker] Subindo containers...');
  try {
    execSync(`docker compose -f "${composePath}" up -d`, { stdio: 'pipe', timeout: 60000 });
    console.log('[Docker] Containers iniciados!');
  } catch (e) {
    console.warn('[Docker] Erro ao subir containers:', e.message.substring(0, 200));
  }

  // Detectar o caminho real do volume /media no host
  try {
    const inspectOut = execSync(
      'docker inspect videoforge-python-worker --format "{{json .Mounts}}"',
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const mounts = JSON.parse(inspectOut.trim());
    const mediaMount = mounts.find(m => m.Destination === '/media');
    if (mediaMount && mediaMount.Source && fs.existsSync(mediaMount.Source)) {
      detectedMediaDir = mediaMount.Source;
      console.log(`[Docker] MEDIA_DIR detectado: ${detectedMediaDir}`);
    }
  } catch (e) {
    console.warn('[Docker] Não foi possível detectar MEDIA_DIR:', e.message.substring(0, 100));
  }
}

// ============================================
// Auto Updater
// ============================================
function setupAutoUpdater() {
  // Não checar em modo de desenvolvimento
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;   // baixa automaticamente em background
  autoUpdater.autoInstallOnAppQuit = true; // instala quando o app fechar

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Verificando atualizações...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[Updater] Nova versão disponível: ${info.version}`);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização disponível',
      message: `VideoForge ${info.version} disponível!`,
      detail: 'A atualização está sendo baixada em segundo plano.\nSerá instalada automaticamente quando você fechar o app.',
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] App está na versão mais recente.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    console.log(`[Updater] Baixando: ${pct}%`);
    if (mainWindow) mainWindow.setProgressBar(progress.percent / 100);
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.setProgressBar(-1);
    console.log(`[Updater] Download concluído: ${info.version}`);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização pronta',
      message: `VideoForge ${info.version} baixado!`,
      detail: 'Reinicie o app para aplicar a atualização.',
      buttons: ['Reiniciar agora', 'Reiniciar depois']
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Erro:', err.message);
  });

  // Checar agora e a cada 2 horas
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 2 * 60 * 60 * 1000);
}

// ============================================
// Lifecycle do App
// ============================================
app.whenReady().then(async () => {
  // Splash / loading
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false }
  });

  splash.loadURL(`data:text/html;charset=utf-8,
    <html>
    <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
      background:linear-gradient(135deg,%23667eea 0%25,%23764ba2 100%25);font-family:system-ui;
      border-radius:16px;color:white;flex-direction:column;-webkit-app-region:drag;">
      <div style="font-size:48px;margin-bottom:16px">🎬</div>
      <h1 style="margin:0;font-size:28px">VideoForge</h1>
      <p style="margin:8px 0 0;opacity:0.8;font-size:14px">Iniciando servidor...</p>
      <div style="margin-top:20px;width:40px;height:40px;border:3px solid rgba(255,255,255,0.3);
        border-top:3px solid white;border-radius:50%;animation:spin 1s linear infinite;"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </body></html>
  `);

  try {
    ensureUserData();
    await ensureDockerRunning(splash);
    updateSplash(splash, 'Iniciando servidor...');
    await startBackendServer();
    splash.close();
    createWindow();
    createTray();
    setupAutoUpdater();
  } catch (err) {
    splash.close();
    dialog.showErrorBox('Erro ao iniciar VideoForge', 
      `Não foi possível iniciar o servidor backend.\n\n${err.message}\n\nVerifique se o Node.js e as dependências estão instaladas.`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Não sai, fica no tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackendServer();
});

app.on('will-quit', () => {
  stopBackendServer();
});
