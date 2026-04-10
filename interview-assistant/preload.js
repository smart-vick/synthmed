const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ai', {
  getConfig:       ()             => ipcRenderer.invoke('get-config'),
  saveConfig:      (cfg)          => ipcRenderer.invoke('save-config', cfg),
  openLink:        (url)          => ipcRenderer.invoke('open-link', url),
  openSettings:    ()             => ipcRenderer.send('open-settings'),
  setClickThrough: (enabled)      => ipcRenderer.send('set-click-through', enabled),

  // Text question → Gemini → streaming answer
  askGemini: (question, mode) => ipcRenderer.send('ask-gemini', { question, mode }),
  onAnswer: (cb) => {
    ipcRenderer.removeAllListeners('answer');
    ipcRenderer.on('answer', (_, d) => cb(d));
  },

  onAction: (cb) => {
    ipcRenderer.removeAllListeners('action');
    ipcRenderer.on('action', (_, a) => cb(a));
  },
});
