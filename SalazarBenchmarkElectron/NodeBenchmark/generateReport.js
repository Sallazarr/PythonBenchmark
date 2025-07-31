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


module.exports = {gerarRelatorio};
module.exports = {gerarRelatorioTxt};