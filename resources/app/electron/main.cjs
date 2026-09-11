const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Remove default menu bar for clean native look
Menu.setApplicationMenu(null);

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'ThreatTwin — Enterprise Security Digital Twin',
    backgroundColor: '#0a0e17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

  // Check if running in production mode or dist bundle
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

  if (isProduction && fs.existsSync(distIndex)) {
    win.loadFile(distIndex);
  } else {
    win.loadURL(devServerUrl).catch(() => {
      if (fs.existsSync(distIndex)) {
        win.loadFile(distIndex);
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
