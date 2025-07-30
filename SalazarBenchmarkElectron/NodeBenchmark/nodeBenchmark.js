const si = require('systeminformation');          // Coleta detalhada de hardware e sistema
const os = require('os');                         // Utilitários do SO
const fs = require('fs');                         // Manipulação de arquivos
const path = require('path');                     // Manipulação de caminhos de arquivos
const { performance } = require('perf_hooks');    // Medição precisa de tempo de execução
const usbDetect = require('usb-detection');       // Detecção de dispositivos USB
const { execSync } = require('child_process');    // Execução de comandos do sistema
const { Worker } = require('worker_threads');     // Execução de tarefas pesadas com múltiplas threads
const { lerConfigJson } = require('./getPayerConfigJson.js');


// --- Utils ---

// Converte bytes para GB com 2 casas decimais
function bytesToGB(bytes) {
  return +(bytes / (1024 ** 3)).toFixed(2);
}

// Obtém pasta para salvar relatórios
function getReportsFolder() {
  // Tenta LOCALAPPDATA para Windows, senão pasta local do executável
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const basePath = path.join(localAppData, 'salazarbenchmarkelectron', 'relatorios');
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    return basePath;
  } else {
    const basePath = path.join(__dirname, 'relatorios');
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    return basePath;
  }
}

// --- Coleta de Informações ---

async function getCPUInfo() {
  const cpuData = await si.cpu();
  return {
    name: cpuData.brand,
    cores: cpuData.physicalCores,
    threads: cpuData.cores,
    freq: cpuData.speedMax ? Math.round(cpuData.speedMax * 1000) : 0 // MHz (speedMax em GHz)
  };
}

async function getRAMInfo() {
  const memData = await si.mem();
  return {
    total: bytesToGB(memData.total),
    used: bytesToGB(memData.active),
    available: bytesToGB(memData.available),
    percent: Math.round((memData.active / memData.total) * 100)
  };
}

async function getDiskPartitionsInfo() {
  try {
    const partitions = await si.blockDevices();
    return partitions.map(p => ({
      nome: p.name,
      tipo: p.type,
      interface: p.interfaceType || 'Desconhecida',
      mount: p.mount || 'Não Montado',
      sistema: p.fsType || 'Desconhecido',
      tamanhoGB: bytesToGB(p.size || 0),
      label: p.label || '',
      modelo: p.model || '',
      vendor: p.vendor || '',
      serial: p.serial || ''
    }));
  } catch {
    return [];
  }
}


async function getDiskInfo() {
  try {
    const partitions = await si.fsSize(); // lista volumes montados, ex: C:, D:, etc.
    const discos = partitions
      .filter(p => p.mount && p.mount !== '') // só partições montadas
      .map(p => ({
        device: p.fs,               // ex: C:\
        mountpoint: p.mount,        // ex: C:\
        fstype: p.type,             // tipo FS, ex: NTFS, ext4
        total: bytesToGB(p.size),
        free: bytesToGB(p.available),
        used_percent: p.use
      }));
    return discos;
  } catch (err) {
    console.error("Erro ao coletar discos:", err);
    return [];
  }
}


async function getOSInfo() {
  const osData = await si.osInfo();
  return {
    system: osData.platform,
    version: osData.release,
    release: osData.build,
    architecture: os.arch()
  };
}

async function getUptime() {
  const uptimeSec = os.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = Math.floor(uptimeSec % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

async function getBIOSDate() {
  try {
    const bios = await si.bios();
    return bios.releaseDate || "Desconhecido";
  } catch {
    return "Desconhecido";
  }
}

async function getWindowsEditionAndVersion() {
  // Tenta pegar via comando PowerShell (só Windows)
  if (os.platform() !== 'win32') return ["Não Windows", "N/A"];

  try {
    const edition = execSync('powershell "(Get-CimInstance -ClassName Win32_OperatingSystem).Caption"', { encoding: 'utf8' }).trim();
    const version = execSync('powershell "(Get-CimInstance -ClassName Win32_OperatingSystem).Version"', { encoding: 'utf8' }).trim();
    return [edition, version];
  } catch {
    return ["Desconhecido", "Desconhecido"];
  }
}

async function getMachineType() {
  // heurística básica
  const chassis = await si.chassis();
  if (!chassis.type) return "Desconhecido";

  const notebookTypes = ['Notebook', 'Laptop', 'Portable'];
  if (notebookTypes.includes(chassis.type)) return "Notebook";
  if (chassis.type === 'Desktop') return "Desktop";
  return chassis.type;
}

async function getMotherboardInfo() {
  try {
    const mb = await si.baseboard();
    return {
      Fabricante: mb.manufacturer || "Desconhecido",
      Modelo: mb.model || "Desconhecido"
    };
  } catch {
    return { Fabricante: "Desconhecido", Modelo: "Desconhecido" };
  }
}

async function getUSBDevices() {
  return new Promise((resolve) => {
    usbDetect.find((err, devices) => {
      if (err) {
        resolve([]);
      } else {
        const names = devices.map(d => d.deviceName || d.productName || "USB Device");
        resolve([...new Set(names)]); // Remove duplicados
      }
    });
  });
}

async function getUSBPorts() {
  // systeminformation não lista portas USB diretamente, então retornamos a mesma lista de dispositivos
  return getUSBDevices();
}


// --- Testes de Benchmark ---

// Teste CPU - soma de quadrados com threads simulados (não nativos no Node)
function trabalhoPesado(start, end) {
  let total = 0;
  for (let i = start; i < end; i++) total += i * i;
  return total;
}

function runWorker(start, end) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');
      parentPort.on('message', ([start, end]) => {
        let total = 0;
        for(let i = start; i < end; i++) total += i * i;
        parentPort.postMessage(total);
      });
    `, { eval: true });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage([start, end]);
  });
}

async function testeCPU() {
  const numThreads = require('os').cpus().length;
  const intervalo = Math.floor(1_000_000_000 / numThreads);
  const ranges = Array.from({ length: numThreads }, (_, i) => [i * intervalo, (i + 1) * intervalo]);

  const start = performance.now();

  // Roda todos os workers paralelamente
  const resultados = await Promise.all(ranges.map(([startRange, endRange]) => runWorker(startRange, endRange)));

  const end = performance.now();

  // resultados tem a soma parcial de cada thread
  const total = resultados.reduce((acc, val) => acc + val, 0);

  console.log("Resultado total:", total);

  return ((end - start) / 1000).toFixed(3);
}

// Calcula fatorial (limitado para evitar overflow)
function factorial(n) {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}


// Teste CPU com fatorial (mais pesado)
function trabalhoFatorial(start, end) {
  let total = 0;
  for (let i = start; i < end; i++) {
    total += factorial((i % 200) + 1);
  }
  return total;
}

// Worker para o teste fatorial
function runWorkerFatorial(start, end) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');

      function factorial(n) {
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
      }

      parentPort.on('message', ([start, end]) => {
        let total = 0;
        for (let i = start; i < end; i++) {
          total += factorial((i % 500) + 1);
        }
        parentPort.postMessage(total);
      });
    `, { eval: true });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage([start, end]);
  });
}

async function testeCPUFatorial() {
  const numThreads = os.cpus().length;
  const intervalo = Math.floor(1000000 / numThreads);
  const ranges = Array.from({ length: numThreads }, (_, i) => [i * intervalo, (i + 1) * intervalo]);

  const start = performance.now();

  // Roda todos os workers paralelamente
  const resultados = await Promise.all(ranges.map(([startRange, endRange]) => runWorkerFatorial(startRange, endRange)));

  const end = performance.now();

  // resultados tem a soma parcial de cada thread
  const total = resultados.reduce((acc, val) => acc + val, 0);

  console.log("Resultado total fatorial:", total);

  return ((end - start) / 1000).toFixed(3);
}


// Teste disco - escreve e lê arquivo temporário
async function testeDiscoEmPath(mountpoint) {
  const tempDir = path.join(mountpoint, 'TempBenchmarkNode');
  const tempFile = path.join(tempDir, 'benchmark_test_file.tmp');
  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const data = Buffer.alloc(200 * 1024 * 1024, 0); // 200 MB zeros

    const startWrite = performance.now();
    fs.writeFileSync(tempFile, data);
    const endWrite = performance.now();

    const startRead = performance.now();
    fs.readFileSync(tempFile);
    const endRead = performance.now();

    fs.unlinkSync(tempFile);
    fs.rmdirSync(tempDir);

    return {
      write: ((endWrite - startWrite) / 1000).toFixed(3),
      read: ((endRead - startRead) / 1000).toFixed(3)
    };
  } catch {
    return { write: -1, read: -1 };
  }
}

async function testeTodosDiscos(disks) {
  const resultados = {};
  for (const disk of disks) {
    resultados[disk.device] = await testeDiscoEmPath(disk.mountpoint);
  }
  return resultados;
}

// Teste alocação RAM
async function testeRAMAlocacao() {
  try {
    const start = performance.now();
    const arr = new Float64Array(100_000_000);
    for (let i = 0; i < arr.length; i++) arr[i] = 1.0;
    const end = performance.now();
    return ((end - start) / 1000).toFixed(3);
  } catch {
    return Infinity;
  }
}


// --- Cálculo de pontuação (igual ao Python) ---

function calcularPontuacoes(cpu, ram, discos, tempoCPU, tempoCPUFat, temposDiscos, tempoRAM) {
  const tempoCPURef = 1.0;
  const tempoCPUFatRef = 0.05;
  const tempoDiscoRef = 1.0;
  const tempoRAMRef = 0.5;

  const scoreCPUSoma = Math.max(0, 10 * Math.sqrt(tempoCPURef / tempoCPU));
  const scoreCPUFat = Math.max(0, 10 * Math.sqrt(tempoCPUFatRef / tempoCPUFat));
  const scoreCPU = Math.min(10, scoreCPUSoma * 0.7 + scoreCPUFat * 0.3);

  const scoreRAMCap = Math.min(10, (ram.total / 8) * 10);
  const scoreRAMVel = tempoRAM === undefined ? 10 : Math.min(10, Math.max(0, 10 * Math.sqrt(tempoRAMRef / tempoRAM)));
  const scoreRAM = Math.min(10, scoreRAMCap * 0.5 + scoreRAMVel * 0.5);

  const scoresDiscos = Object.values(temposDiscos).map(({ write, read }) => {
    if (write === -1 || read === -1) return 0;
    const tempoTotal = +write + +read;
    let score = 10 * Math.sqrt(tempoDiscoRef / tempoTotal);
    return Math.min(10, Math.max(0, score));
  });

  const scoreDisco = scoresDiscos.length ? (scoresDiscos.reduce((a, b) => a + b, 0) / scoresDiscos.length) : 0;

  const media = +(scoreCPU * 0.6 + scoreRAM * 0.35 + scoreDisco * 0.05).toFixed(2);

  return [
    +scoreCPU.toFixed(2),
    +scoreRAM.toFixed(2),
    +scoreDisco.toFixed(2),
    media
  ];
}


// --- Geração do relatório (txt e json) ---

function gerarRelatorioTxt(data) {
  const {
    cpu, ram, disks, osInfo, motherboard, uptime, usbPorts, usbDevices,
    tempoCPU, tempoCPUFatorial, temposDiscos, tempoRAM,
    scores, erros, biosDate, winEdition, winVersion, machineType
  } = data;

  let txt = '';

  txt += `[Sistema Operacional]\n`;
  txt += `Sistema: ${osInfo.system}\n`;
  txt += `Versão: ${osInfo.version}\n`;
  txt += `Release: ${osInfo.release}\n`;
  txt += `Arquitetura: ${osInfo.architecture}\n`;
  txt += `Uptime: ${uptime}\n`;
  txt += `Data BIOS: ${biosDate}\n`;
  txt += `Windows: ${winEdition} - Versão ${winVersion}\n`;
  txt += `Tipo de Máquina: ${machineType}\n`;
  txt += '='.repeat(40) + '\n\n';

  txt += `[CPU]\n`;
  txt += `Nome: ${cpu.name}\n`;
  txt += `Núcleos Físicos: ${cpu.cores}\n`;
  txt += `Núcleos Lógicos: ${cpu.threads}\n`;
  txt += `Frequência Máxima: ${cpu.freq} MHz\n`;
  txt += `Tempo teste soma quadrados: ${tempoCPU}s\n`;
  txt += `Tempo teste fatorial: ${tempoCPUFatorial}s\n`;
  txt += '='.repeat(40) + '\n\n';

  txt += `[Memória RAM]\n`;
  txt += `Total: ${ram.total} GB\n`;
  txt += `Usada: ${ram.used} GB\n`;
  txt += `Disponível: ${ram.available} GB\n`;
  txt += `Uso: ${ram.percent}%\n`;
  txt += `Tempo alocação RAM: ${tempoRAM}s\n`;
  txt += '='.repeat(40) + '\n\n';

  txt += `[Partições / Volumes Lógicos]\n`;
for (const part of data.partitions || []) {
  txt += `Partição: ${part.nome} (${part.mount})\n`;
  txt += `  Tamanho: ${part.tamanhoGB} GB\n`;
  txt += `  Tipo: ${part.tipo}\n`;
  txt += `  Sistema de Arquivos: ${part.sistema}\n`;
  txt += `  Label: ${part.label}\n`;
  txt += `  Interface: ${part.interface}\n`;
  txt += `  Modelo: ${part.modelo}\n`;
  txt += `  Vendor: ${part.vendor}\n`;
  txt += `  Serial: ${part.serial}\n\n`;
}
txt += '='.repeat(40) + '\n\n';


  txt += `[Discos]\n`;
  for (const disco of disks) {
    txt += `Disco: ${disco.device} (${disco.mountpoint})\n`;
    txt += `  Total: ${disco.total} GB\n`;
    txt += `  Livre: ${disco.free} GB\n`;
    txt += `  Usado (%): ${disco.used_percent}%\n`;
    if (temposDiscos && temposDiscos[disco.device]) {
      txt += `  Tempo escrita: ${temposDiscos[disco.device].write}s\n`;
      txt += `  Tempo leitura: ${temposDiscos[disco.device].read}s\n`;
    }
    txt += '\n';
  }
  txt += '='.repeat(40) + '\n\n';

  txt += `[Placa Mãe]\n`;
  txt += `Fabricante: ${motherboard.Fabricante}\n`;
  txt += `Modelo: ${motherboard.Modelo}\n`;
  txt += '='.repeat(40) + '\n\n';

  txt += `[Portas USB]\n`;
  usbPorts.forEach(p => { txt += `- ${p}\n`; });
  txt += '='.repeat(40) + '\n\n';

  txt += `[Dispositivos USB Detectados]\n`;
  usbDevices.forEach(d => { txt += `- ${d}\n`; });
  txt += '='.repeat(40) + '\n\n';

  if (erros && erros.length) {
    txt += `[Erros e Avisos]\n`;
    erros.forEach(e => { txt += `- ${e}\n`; });
    txt += '='.repeat(40) + '\n\n';
  }

  if (scores) {
    txt += `[Pontuações]\n`;
    txt += `CPU: ${scores[0]}/10\n`;
    txt += `RAM: ${scores[1]}/10\n`;
    txt += `Disco: ${scores[2]}/10\n`;
    txt += `Pontuação Final: ${scores[3]}/10\n`;
    txt += '='.repeat(40) + '\n\n';
  }

  return txt;
}

async function gerarRelatorio(data) {
  const pasta = getReportsFolder();

  // use o timestamp que veio do main(); se não vier, gere um local
  const timestampLocal = data.timestamp || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // derive um timestamp seguro para nome de arquivo a partir do local
  const timestampForFile = timestampLocal
    .replace(/[\/:]/g, '-')  // troca "/" e ":" por "-"
    .replace(' ', '_');      // troca espaço por "_"

  const nomeTxt = `relatorio_benchmark_${timestampForFile}.txt`;
  const nomeJson = `relatorio_benchmark_${timestampForFile}.json`;

  const relatorioTxt = gerarRelatorioTxt(data);
  const relatorioJson = {
    "Timestamp": timestampLocal, // usa o mesmo timestamp

    "Sistema Operacional": {
      "Sistema": data.osInfo.system,
      "Versão": data.osInfo.version,
      "Release": data.osInfo.release,
      "Arquitetura": data.osInfo.architecture,
      "Uptime": data.uptime,
      "Data BIOS": data.biosDate,
      "Windows": data.winEdition,
      "Versão Windows": data.winVersion,
      "Tipo de Máquina": data.machineType
    },
    "CPU": {
      ...data.cpu,
      "Tempo teste soma quadrados": data.tempoCPU,
      "Tempo teste fatorial": data.tempoCPUFatorial
    },
    "RAM": {
      ...data.ram,
      "Tempo alocação RAM": data.tempoRAM
    },
    "Discos": data.disks,
    "Partições": data.partitions,
    "Tempos Discos": data.temposDiscos,
    "Placa Mãe": data.motherboard,
    "Portas USB": data.usbPorts.map(nome => ({ nome })),
    "Dispositivos USB": data.usbDevices.map(nome => ({ nome })),
    "Erros": data.erros,
    "Pontuações": {
      "CPU":  data.scores ? data.scores[0] : null,
      "RAM":  data.scores ? data.scores[1] : null,
      "Disco":data.scores ? data.scores[2] : null,
      "Final":data.scores ? data.scores[3] : null
    }
  };

  await fs.promises.writeFile(path.join(pasta, nomeTxt), relatorioTxt, 'utf8');
  await fs.promises.writeFile(path.join(pasta, nomeJson), JSON.stringify(relatorioJson, null, 4), 'utf8');

  console.log(`Relatórios salvos em:\n${path.join(pasta, nomeTxt)}\n${path.join(pasta, nomeJson)}`);
  console.log(`Pasta onde foram salvos os relatórios: ${pasta}`);
}


// --- Verificações de Requisitos ---

function verificarRequisitos(cpu, ram, disks) {
  const erros = [];

  if (cpu.freq < 1800 || cpu.cores < 2) {
    erros.push(`CPU abaixo do mínimo: ${cpu.freq} MHz e ${cpu.cores} núcleos (mínimo 1900 MHz e 2 núcleos)`);
  }

  if (ram.total < 4) {
    erros.push(`RAM insuficiente: ${ram.total} GB (mínimo 4 GB)`);
  }

  for (const disk of disks) {
    if (disk.free < 1) {
      erros.push(`Pouco espaço livre em disco ${disk.device} (${disk.mountpoint}): ${disk.free} GB (mínimo 1 GB)`);
    }
  }

  return erros;
}

function verificarRequisitosAvancados(machineType) {
  const erros = [];
  if (machineType !== "Desktop") {
    erros.push(`Recomendado usar máquina Desktop, detectado: ${machineType}`);
  }
  return erros;
}

const { formatarDadosParaEnvio } = require('../utils/JsonFormatter.js');
const { enviarBenchmarkAPI } = require('../utils/PostFormattedJson.js'); // ou qualquer nome que tenha usado



// --- MAIN ---

async function main() {
  console.log("Iniciando Salazar Benchmark Node.js...");

  // Coleta básica
  const cpu = await getCPUInfo();
  const ram = await getRAMInfo();
  const partitions = await getDiskPartitionsInfo();
  const disks = await getDiskInfo();
  const osInfo = await getOSInfo();
  const uptime = await getUptime();
  const biosDate = await getBIOSDate();
  const [winEdition, winVersion] = await getWindowsEditionAndVersion();
  const machineType = await getMachineType();
  const motherboard = await getMotherboardInfo();
  const usbDevices = await getUSBDevices();
  const usbPorts = await getUSBPorts();

  // Testes
  const tempoCPU = await testeCPU();
  const tempoCPUFatorial = await testeCPUFatorial();
  const temposDiscos = await testeTodosDiscos(disks);
  const tempoRAM = await testeRAMAlocacao();

  // Score
  const scores = calcularPontuacoes(cpu, ram, disks, +tempoCPU, +tempoCPUFatorial, temposDiscos, +tempoRAM);

  // Verificações
  let erros = verificarRequisitos(cpu, ram, disks);
  erros = erros.concat(verificarRequisitosAvancados(machineType));

  const timeZone = 'America/Sao_Paulo';
  const timestampLocal = new Date().toLocaleString('pt-BR', { timeZone });




  const dadosPayer = lerConfigJson();
  console.log("Dados do config.json", dadosPayer);

  // Monta dados
  const dadosRelatorio = {
        timestamp: timestampLocal, dadosPayer,
    cpu, ram, partitions, disks, osInfo, uptime, biosDate,
    winEdition, winVersion,
    machineType, motherboard,
    usbDevices, usbPorts,
    tempoCPU, tempoCPUFatorial, temposDiscos, tempoRAM,
    scores, erros

  };

  
  // Gera relatório
  await gerarRelatorio(dadosRelatorio);


  console.log("Benchmark finalizado.");

   // Enviar JSON formatado
 const jsonFormatado = formatarDadosParaEnvio(dadosRelatorio);
console.log("JSON a ser enviado:", JSON.stringify(jsonFormatado, null, 2));
await enviarBenchmarkAPI(jsonFormatado);

  return dadosRelatorio
}

if (require.main === module) {
  main();
}

module.exports = { main };

