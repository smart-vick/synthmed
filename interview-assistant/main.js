const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

const CONFIG_PATH = path.join(app.getPath('userData'), 'interview-ai-config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return {}; }
}
function saveConfig(d) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(d, null, 2));
}

let config = loadConfig();
let overlayWin = null;
let settingsWin = null;

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  overlayWin = new BrowserWindow({
    width: 520, height: 500,
    x: width - 540, y: height - 520,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    backgroundColor: '#0d0d1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  overlayWin.loadFile(path.join(__dirname, 'src', 'overlay.html'));
  overlayWin.setAlwaysOnTop(true, 'screen-saver');

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    overlayWin?.isVisible() ? overlayWin.hide() : overlayWin.show();
  });
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    overlayWin?.webContents.send('action', 'clear');
  });
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    overlayWin?.webContents.send('action', 'force');
  });
}

function createSettings() {
  settingsWin = new BrowserWindow({
    width: 480, height: 420,
    resizable: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.loadFile(path.join(__dirname, 'src', 'settings.html'));
}

app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');

app.whenReady().then(() => {
  config.GEMINI_API_KEY ? createOverlay() : createSettings();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('will-quit', () => globalShortcut.unregisterAll());

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => config);

ipcMain.handle('save-config', (_, c) => {
  config = { ...config, ...c };
  saveConfig(config);
  settingsWin?.close();
  settingsWin = null;
  if (!overlayWin) createOverlay();
  return true;
});

ipcMain.handle('open-link', (_, url) => shell.openExternal(url));

ipcMain.on('open-settings', () => {
  if (!settingsWin) createSettings();
  else settingsWin.focus();
});

ipcMain.on('set-click-through', (_, enabled) => {
  overlayWin?.setIgnoreMouseEvents(enabled, { forward: true });
});

// ── Text question → Gemini answer (streaming) ─────────────────────────────────
const PROMPTS = {
  technical:
    'You are a real-time technical interview assistant. The user is in a live phone interview. ' +
    'Answer as the CANDIDATE in first person. Format: 1-2 sentence direct answer, then 2-3 bullet points. MAX 120 words. No filler.',
  behavioral:
    'You are a real-time behavioral interview assistant. The user is in a live phone interview. ' +
    'Answer as the CANDIDATE using STAR method (Situation, Task, Action, Result). MAX 120 words. Natural confident tone.',
  general:
    'You are a real-time interview assistant. The user is in a live phone interview. ' +
    'Answer as the CANDIDATE, confident and specific. MAX 100 words. No filler.',
};

ipcMain.on('ask-gemini', async (_, { question, mode }) => {
  if (!config.GEMINI_API_KEY || !overlayWin) return;
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: PROMPTS[mode] || PROMPTS.general,
    });
    const result = await model.generateContentStream(question);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) overlayWin.webContents.send('answer', { text, done: false });
    }
    overlayWin.webContents.send('answer', { text: '', done: true });
  } catch (err) {
    overlayWin.webContents.send('answer', { text: 'Error: ' + err.message, done: true, error: true });
  }
});
