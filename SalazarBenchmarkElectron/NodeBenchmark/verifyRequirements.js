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

module.exports = {verificarRequisitos};
module.exports = {verificarRequisitosAvancados};