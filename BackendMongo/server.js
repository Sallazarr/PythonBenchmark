const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDb, getInstanceDb } = require("./connection");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // para interpretar JSON

connectDb().then(() => {
  console.log("Banco de dados conectado. Iniciando servidor Express...\n");

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
});

app.get("/", (req, res) => {
  res.send("Servidor Express ativo. MongoDB conectado.");
});

app.post("/benchmark", async (req, res) => {
  try {
    const db = getInstanceDb();
    const collection = db.collection("benchmarks");

    const data = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const result = await collection.insertOne(data);
    res.status(201).json({ message: "Benchmark salvo com sucesso!", id: result.insertedId });
  } catch (error) {
    console.error("Erro ao salvar benchmark:", error);
    res.status(500).json({ error: "Erro interno ao salvar benchmark." });
  }
});
