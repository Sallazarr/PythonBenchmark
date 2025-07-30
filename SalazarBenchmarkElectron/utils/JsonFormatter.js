function formatarDadosParaEnvio(dadosRelatorio) {
  console.log("DADOS RELATÓRIO COMPLETO:", JSON.stringify(dadosRelatorio, null, 2));
  const dadosReestruturados = {
    "Sistema Operacional": {
      Windows: dadosRelatorio.winEdition,
      "Data BIOS": dadosRelatorio.biosDate,
      "Tipo de Máquina": dadosRelatorio.machineType
    },
    CPU: dadosRelatorio.cpu,
    RAM: dadosRelatorio.ram,
    Discos: dadosRelatorio.disks,
    "Tempos Discos": dadosRelatorio.temposDiscos,
    "Placa Mãe": dadosRelatorio.motherboard,
    "Pontuações": dadosRelatorio.scores ? {
    CPU: dadosRelatorio.scores[0],
    RAM: dadosRelatorio.scores[1],
    Disco: dadosRelatorio.scores[2],
    Final: dadosRelatorio.scores[3]
    } : {},
    "Tempos Testes": dadosRelatorio.temposTestes // << ADICIONAR ESTA LINHA
  };

  const tempos = {
  tempoSomaQuadrados: dadosRelatorio.tempoCPU || null,
  tempoFatorial: dadosRelatorio.tempoCPUFatorial || null,
  tempoAlocacaoRAM: dadosRelatorio.tempoRAM || null
};


  const timestampLocal = dadosRelatorio.timestamp || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return {
    timestamp: timestampLocal, // <<<<<< enviado para o DB
    dadosPayer: dadosRelatorio.dadosPayer || null,
    sistema: {
      windows: dadosReestruturados["Sistema Operacional"]?.Windows,
      dataBIOS: dadosReestruturados["Sistema Operacional"]?.["Data BIOS"],
      tipoMaquina: dadosReestruturados["Sistema Operacional"]?.["Tipo de Máquina"]
    },
    cpu: dadosReestruturados.CPU,
    ram: dadosReestruturados.RAM,
    discos: dadosReestruturados.Discos?.map(disco => ({
      device: disco.device,
      total: disco.total,
      free: disco.free
    })),
    temposDiscos: dadosReestruturados["Tempos Discos"],
    placaMae: dadosReestruturados["Placa Mãe"],
    temposTestes: tempos,
    pontuacoes: dadosReestruturados["Pontuações"] || {}
  };
}

module.exports = { formatarDadosParaEnvio };
