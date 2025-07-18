const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // caso tenha preload
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.loadFile('index.html');
}

// Chamar o .exe quando o renderer pedir
ipcMain.handle('rodar-benchmark', async () => {
  const exePath = path.join(__dirname, '..', 'python_bin', 'SalazarBenchmark.exe');

  return new Promise((resolve, reject) => {
    execFile(exePath, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro:', error);
        reject(error.message);
      } else if (stderr) {
        console.error('Stderr:', stderr);
        resolve(stderr);
      } else {
        console.log('Resultado:', stdout);
        resolve(stdout);
      }
    });
  });
});

app.whenReady().then(createWindow);
