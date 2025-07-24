const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const benchmark = require("./NodeBenchmark/nodeBenchmark")
const url = require("url");

const {connectDb, getInstanceDb, closeConnectionDb} = require('./database/connection');

// Cria a janela
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      /* webSecurity: false, ativar essa linha para debug*/
    },
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    url.format({
      pathname: path.join(__dirname, "./renderer/dist/index.html"),
      protocol: "file:",
      slashes: true,
    });

  win.loadURL(startUrl);
  //win.removeMenu(); 
  win.webContents.openDevTools(); /* pra abrir o devtools no executavel */
}

// Registra o handler do benchmark (apenas UMA vez, com PYTHONIOENCODING)
ipcMain.handle("rodar-benchmark", async () => {
  try{
  const resultado = await benchmark.main();
  return resultado
  }catch(err){
    console.error("erro ao rodar o benchmark:", err);
    throw err;
  }
  
});

// Inicializa o app
app.whenReady().then(async () => {
  await connectDb(); // chama conexão com mongo
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", closeConnectionDb) //mata conexão com mongo
