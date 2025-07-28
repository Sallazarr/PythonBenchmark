function formatarDadosParaEnvio(dados) {
  return {
    sistema: {
      windows: dados["Sistema Operacional"]?.Windows,
      dataBIOS: dados["Sistema Operacional"]?.["Data BIOS"],
      tipoMaquina: dados["Sistema Operacional"]?.["Tipo de Máquina"]
    },
    cpu: dados.CPU,
    ram: dados.RAM,
    discos: dados.Discos?.map(disco => ({
      device: disco.device,
      total: disco.total,
      free: disco.free
    })),
    temposDiscos: dados["Tempos Discos"],
    placaMae: dados["Placa Mãe"],
    pontuacoes: dados["Pontuações"]
  };
}

module.exports = { formatarDadosParaEnvio };
