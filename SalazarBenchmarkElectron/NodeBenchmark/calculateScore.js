function calcularPontuacoes(cpu, ram, discos, tempoCPU, tempoCPUFat, temposDiscos, tempoRAM) {
  const tempoCPURef = 1.0;
  const tempoCPUFatRef = 0.05;
  const tempoDiscoRef = 1.0;
  const tempoRAMRef = 0.5;

  // Garantir que todos os tempos são números
  tempoCPU = parseFloat(tempoCPU) || 1.0;
  tempoCPUFat = parseFloat(tempoCPUFat) || 0.1;
  tempoRAM = parseFloat(tempoRAM) || 5.0;

  const scoreCPUSoma = Math.max(0, 10 * Math.sqrt(tempoCPURef / tempoCPU));
  const scoreCPUFat = Math.max(0, 10 * Math.sqrt(tempoCPUFatRef / tempoCPUFat));
  const scoreCPU = Math.min(10, scoreCPUSoma * 0.7 + scoreCPUFat * 0.3);

  const ramTotal = parseFloat(ram?.total) || 0;
  const scoreRAMCap = ramTotal > 0 ? Math.min(10, (ramTotal / 8) * 10) : 0;
  const scoreRAMVel = Math.min(10, Math.max(0, 10 * Math.sqrt(tempoRAMRef / tempoRAM)));
  const scoreRAM = Math.min(10, scoreRAMCap * 0.5 + scoreRAMVel * 0.5);

  const scoresDiscos = Object.values(temposDiscos || {}).map(({ write, read }) => {
    if (write === -1 || read === -1) return 0;
    const tempoTotal = parseFloat(write) + parseFloat(read);
    if (isNaN(tempoTotal) || tempoTotal <= 0) return 0;
    let score = 10 * Math.sqrt(tempoDiscoRef / tempoTotal);
    return Math.min(10, Math.max(0, score));
  });

  const scoreDisco = scoresDiscos.length
    ? (scoresDiscos.reduce((a, b) => a + b, 0) / scoresDiscos.length)
    : 0;

  const media = +(scoreCPU * 0.6 + scoreRAM * 0.35 + scoreDisco * 0.05).toFixed(2);

  return [
    +scoreCPU.toFixed(2),
    +scoreRAM.toFixed(2),
    +scoreDisco.toFixed(2),
    media
  ];
}


module.exports = {calcularPontuacoes};
