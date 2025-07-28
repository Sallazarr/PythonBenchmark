const axios = require('axios');

async function enviarBenchmarkAPI(payload) {
  try {
    await axios.post("https://payerbenchmark.onrender.com/benchmark", payload);
    console.log("Benchmark enviado com sucesso!");
  } catch (err) {
    console.error("Erro ao enviar benchmark:", err.message);
  }
}

module.exports = { enviarBenchmarkAPI };
