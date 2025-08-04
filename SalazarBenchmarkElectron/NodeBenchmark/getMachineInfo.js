const si = require('systeminformation');          // Coleta detalhada de hardware e sistema
const os = require('os');                         // Utilitários do SO
const fs = require('fs');                         // Manipulação de arquivos
const path = require('path');                     // Manipulação de caminhos de arquivos
const { performance } = require('perf_hooks');    // Medição precisa de tempo de execução
const usbDetect = require('usb-detection');       // Detecção de dispositivos USB
const { execSync } = require('child_process'); 

// Converte bytes para GB com 2 casas decimais
function bytesToGB(bytes) {
  return +(bytes / (1024 ** 3)).toFixed(2);
}

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
  const totalGB = bytesToGB(memData.total);
  const installed = Math.ceil(totalGB);
  return {
    total: totalGB,
    installed: installed,
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


module.exports = {
getCPUInfo, 
 getBIOSDate,
  getDiskInfo,
   getDiskPartitionsInfo,
    getMachineType,
     getMotherboardInfo,
      getOSInfo,
       getRAMInfo,
        getUSBDevices,
         getUSBPorts,
          getUptime,
           getWindowsEditionAndVersion};
