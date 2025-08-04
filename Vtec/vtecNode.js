const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { execFile } = require("child_process"); // <-- declarar só 1x
const { buscarUltimaVersao } = require("./searchSetupUrl");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function pergunta(texto) {
  return new Promise(resolve => rl.question(texto, resolve));
}

function baixarArquivo(url, destino) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destino);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Erro ao baixar: HTTP ${res.statusCode}`));
        return;
      }

      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

async function main() {
  console.log("Qual versão você deseja baixar?");
  console.log("1 - Payer (oficial)");
  console.log("2 - Associadas (whitelabel)");
  const opcao = await pergunta("Digite 1 ou 2: ");

  let urlBase, prefixo;
  if (opcao === "1") {
    urlBase = "https://checkout-apps2.s3.amazonaws.com/";
    prefixo = "setup_payer_checkout_v";
  } else if (opcao === "2") {
    urlBase = "https://associadas.s3.amazonaws.com/";
    prefixo = "setup_associadas_checkout_v";
  } else {
    console.log("❌ Opção inválida.");
    rl.close();
    return;
  }

  console.log("\nDeseja baixar a versão:");
  console.log("1 - Mais recente estável");
  console.log("2 - Mais recente beta");
  const tipo = await pergunta("Digite 1 ou 2: ");
  const tipoVersao = tipo === "1" ? "stable" : "beta";

  console.log("\n🔎 Buscando versão mais recente...");

  try {
    const ultima = await buscarUltimaVersao(urlBase, prefixo, tipoVersao);

    if (!ultima) {
      console.log("❌ Nenhuma versão encontrada.");
      rl.close();
      return;
    }

    const nomeArquivo = ultima.file;
    const urlCompleta = urlBase + nomeArquivo;
    const destino = path.join(os.homedir(), "Downloads", nomeArquivo);

    console.log(`📦 Última versão encontrada: ${ultima.version}`);
    console.log(`🔽 Baixando de: ${urlCompleta}`);
    console.log(`📁 Salvando em: ${destino}`);

    const inicio = Date.now();
    await baixarArquivo(urlCompleta, destino);
    const fim = Date.now();

    console.log(`✅ Download concluído em ${(fim - inicio) / 1000}s`);
    console.log("🚀 Executando instalador...");

execFile(destino, { shell: true }, (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Erro ao executar o instalador:", error);
    return;
  }
  console.log("✅ Instalador executado com sucesso.");
  if (stdout) console.log("stdout:", stdout);
  if (stderr) console.log("stderr:", stderr);
});

  } catch (err) {
    console.log("❌ Erro:", err.message);
  } finally {
    rl.close();
  }
}

main();
