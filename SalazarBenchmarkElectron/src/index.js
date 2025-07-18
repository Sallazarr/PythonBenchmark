const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

// Cria a janela
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  //win.webContents.openDevTools();
}

// Registra o handler do benchmark (apenas UMA vez, com PYTHONIOENCODING)
ipcMain.handle('rodar-benchmark', async () => {
  const exePath = path.join(__dirname, '..', 'python_bin', 'SalazarBenchmark.exe');

  return new Promise((resolve, reject) => {
    execFile(
      exePath,
      [],
      {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error('Erro ao rodar o benchmark:', error);
          reject(error.message);
        } else {
          resolve(stdout || stderr);
        }
      }
    );
  });
});

// Inicializa o app
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
