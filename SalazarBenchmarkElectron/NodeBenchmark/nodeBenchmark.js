const si = require('systeminformation');          // Coleta detalhada de hardware e sistema
const os = require('os');                         // Utilitários do SO
const fs = require('fs');                         // Manipulação de arquivos
const path = require('path');                     // Manipulação de caminhos de arquivos
const { performance } = require('perf_hooks');    // Medição precisa de tempo de execução
const usbDetect = require('usb-detection');       // Detecção de dispositivos USB
const { execSync } = require('child_process');    // Execução de comandos do sistema
const { Worker } = require('worker_threads');     // Execução de tarefas pesadas com múltiplas threads
const { lerConfigJson } = require('./getPayerConfigJson.js');
const {getCPUInfo} = require("./getMachineInfo.js");
const {getBIOSDate} = require("./getMachineInfo.js");
const {getDiskInfo} = require("./getMachineInfo.js");
const {getDiskPartitionsInfo} = require("./getMachineInfo.js");
const {getMachineType} = require("./getMachineInfo.js");
const {getMotherboardInfo} = require("./getMachineInfo.js");
const {getOSInfo} = require("./getMachineInfo.js");
const {getRAMInfo} = require("./getMachineInfo.js");
const {getUSBDevices} = require("./getMachineInfo.js");
const {getUSBPorts} = require("./getMachineInfo.js");
const {getUptime} = require("./getMachineInfo.js");
const {getWindowsEditionAndVersion} = require("./getMachineInfo.js");
const {gerarRelatorio} = require("./generateReport.js");
const {gerarRelatorioTxt} = require("./generateReport.js");
const {testeCPU} = require("./testsBenchmark.js");
const {testeCPUFatorial} = require("./testsBenchmark.js");
const {testeDiscoEmPath} = require("./testsBenchmark.js");
const {testeRAMAlocacao} = require("./testsBenchmark.js");
const {testeTodosDiscos} = require("./testsBenchmark.js");
const {factorial} = require("./testsBenchmark.js");
const {trabalhoFatorial} = require("./testsBenchmark.js");
const {trabalhoPesado} = require("./testsBenchmark.js");
const {runWorker} = require("./testsBenchmark.js");
const {runWorkerFatorial} = require("./testsBenchmark.js");
const {calcularPontuacoes} = require("./calculateScore.js");
const {verificarRequisitos} = require("./verifyRequirements.js");
const {verificarRequisitosAvancados} = require("./verifyRequirements.js");
const { formatarDadosParaEnvio } = require('../utils/JsonFormatter.js');
const { enviarBenchmarkAPI } = require('../utils/PostFormattedJson.js'); 


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


if (erros.length > 0) {
  console.log("\n⚠️  Esta máquina **não atende aos requisitos da Payer.**");
  console.log("Sugestões de melhoria:");
  erros.forEach((erro, index) => {
    console.log(` ${index + 1}. ${erro}`);
  });
  console.log("\n💡 Recomendamos realizar as melhorias acima antes de utilizar o Checkout.");
} else {
  console.log("\n✅ Esta máquina está apta para rodar o Checkout da Payer.");
}



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

