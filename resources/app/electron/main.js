const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Remove default menu bar for a cleaner look
Menu.setApplicationMenu(null);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0a0e17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In dev mode, load the Vite dev server
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  win.loadURL(devServerUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
