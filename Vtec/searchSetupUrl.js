// versionUtils.js
const axios = require("axios");
const xml2js = require("xml2js");

const parser = new xml2js.Parser();

function extractVersion(filename) {
  const match = filename.match(/v(\d+\.\d+\.\d+(?:-[a-z]+)?)/i);
  return match ? match[1] : null;
}

function versionToSortable(version) {
  const [main, tag] = version.split("-");
  const parts = main.split(".").map(Number);
  return [...parts, tag || ""]; // tag "" garante que release vem depois de beta
}

function compareVersions(a, b) {
  const vA = versionToSortable(a.version);
  const vB = versionToSortable(b.version);
  for (let i = 0; i < vA.length; i++) {
    if (typeof vA[i] === "number" && typeof vB[i] === "number") {
      if (vA[i] !== vB[i]) return vA[i] - vB[i];
    } else {
      return vA[i].localeCompare(vB[i]);
    }
  }
  return 0;
}

async function buscarUltimaVersao(bucketUrl, prefixo, tipo) {
  let arquivos = [];
  let token = null;
  let isTruncated = true;

  while (isTruncated) {
    let url = `${bucketUrl}?list-type=2`;
    if (token) url += `&continuation-token=${encodeURIComponent(token)}`;

    const response = await axios.get(url, { headers: { Accept: "application/xml" } });
    const data = await parser.parseStringPromise(response.data);

    const itens = data.ListBucketResult.Contents || [];
    itens.forEach(item => arquivos.push(item.Key[0]));

    isTruncated = data.ListBucketResult.IsTruncated?.[0] === "true";
    token = isTruncated ? data.ListBucketResult.NextContinuationToken?.[0] : null;
  }

  const executaveis = arquivos
    .filter(f => f.startsWith(prefixo) && f.endsWith(".exe") && !f.endsWith(".blockmap"))
    .map(file => ({ file, version: extractVersion(file) }))
    .filter(e => e.version);

  executaveis.sort(compareVersions);

  const filtradas = tipo === "stable"
    ? executaveis.filter(e => !e.version.includes("-"))
    : executaveis.filter(e => e.version.includes("-beta"));

  return filtradas.length ? filtradas[filtradas.length - 1] : null;
}

module.exports = { buscarUltimaVersao };
