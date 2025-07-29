function formatarDadosParaEnvio(dadosRelatorio) {
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
    "Pontuações": dadosRelatorio.scores
  };

  return {
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
    pontuacoes: dadosReestruturados["Pontuações"]
  };
}

module.exports = { formatarDadosParaEnvio };
