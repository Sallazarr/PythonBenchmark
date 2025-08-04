const si = require('systeminformation');          // Coleta detalhada de hardware e sistema
const os = require('os');                         // Utilitários do SO
const fs = require('fs');                         // Manipulação de arquivos
const path = require('path');                     // Manipulação de caminhos de arquivos
const { performance } = require('perf_hooks');    // Medição precisa de tempo de execução
const usbDetect = require('usb-detection');       // Detecção de dispositivos USB
const { execSync } = require('child_process');    // Execução de comandos do sistema
const { Worker } = require('worker_threads');     // Execução de tarefas pesadas com múltiplas threads

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

module.exports = {verificarRequisitos, verificarRequisitosAvancados};
