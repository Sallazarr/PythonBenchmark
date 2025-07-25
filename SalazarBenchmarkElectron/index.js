const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const benchmark = require("./NodeBenchmark/nodeBenchmark")
const url = require("url");

const {connectDb, getInstanceDb, closeConnectionDb} = require('./database/connection');
const fs = require('fs');

const logPath = path.join(app.getPath('userData'), 'app.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function logToFile(...args) {
  const message = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ') + '\n';
  logStream.write(message);
}

console.log = (...args) => {
  logToFile(...args);
  process.stdout.write(args.join(' ') + '\n'); // ainda manda pro stdout se possível
};
console.error = (...args) => {
  logToFile(...args);
  process.stderr.write(args.join(' ') + '\n');
};

console.log('=== App started ===');


// Cria a janela
function createWindow() {
  console.log("Criando janela...")
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

let startUrl;

if (process.env.ELECTRON_START_URL) {
  console.log("🚧 Modo DEV detectado.");
  startUrl = process.env.ELECTRON_START_URL;
} else {
  console.log("✅ Modo produção detectado.");
  startUrl = url.format({
    pathname: path.join(__dirname, "renderer", "dist", "index.html"),
    protocol: "file:",
    slashes: true,
  });
}

    console.log("start URL:", startUrl)
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
//   console.log("💡 App ready, conectando ao Mongo...");
//  // await connectDb(); // chama conexão com mongo
 createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0){
      console.log("Ativando App") 
      createWindow();
}});
 });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// app.on("will-quit", closeConnectionDb) //mata conexão com mongo
