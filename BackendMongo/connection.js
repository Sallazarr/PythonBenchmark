const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("Erro: A variável de ambiente MONGO_URI não foi definida.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let instance = null;

const connectDb = async () => {
  if (instance) return;

  try {
    await client.connect();
    instance = client.db("data");
    console.log("\nConexão com MongoDB estabelecida com sucesso.\n");
  } catch (error) {
    console.error("\nFalha ao se conectar ao MongoDB.\n", error);
    process.exit(1);
  }
};

const getInstanceDb = () => {
  if (!instance) {
    throw new Error("A conexão com o banco de dados não foi estabelecida.");
  }
  return instance;
};

const closeConnectionDb = async () => {
  await client.close();
  console.log("\nConexão com o MongoDB encerrada.\n");
};

module.exports = { connectDb, getInstanceDb, closeConnectionDb };
