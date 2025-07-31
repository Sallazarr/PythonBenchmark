function runWorker(start, end) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');
      parentPort.on('message', ([start, end]) => {
        let total = 0;
        for(let i = start; i < end; i++) total += i * i;
        parentPort.postMessage(total);
      });
    `, { eval: true });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage([start, end]);
  });
}

function trabalhoPesado(start, end) {
  let total = 0;
  for (let i = start; i < end; i++) total += i * i;
  return total;
}


async function testeCPU() {
  const numThreads = require('os').cpus().length;
  const intervalo = Math.floor(1_000_000_000 / numThreads);
  const ranges = Array.from({ length: numThreads }, (_, i) => [i * intervalo, (i + 1) * intervalo]);

  const start = performance.now();

  // Roda todos os workers paralelamente
  const resultados = await Promise.all(ranges.map(([startRange, endRange]) => runWorker(startRange, endRange)));

  const end = performance.now();

  // resultados tem a soma parcial de cada thread
  const total = resultados.reduce((acc, val) => acc + val, 0);

  console.log("Resultado total:", total);

  return ((end - start) / 1000).toFixed(3);
}

// Calcula fatorial (limitado para evitar overflow)
function factorial(n) {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}


// Teste CPU com fatorial (mais pesado)
function trabalhoFatorial(start, end) {
  let total = 0;
  for (let i = start; i < end; i++) {
    total += factorial((i % 500) + 1);
  }
  return total;
}

// Worker para o teste fatorial
function runWorkerFatorial(start, end) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');

      function factorial(n) {
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
      }

      parentPort.on('message', ([start, end]) => {
        let total = 0;
        for (let i = start; i < end; i++) {
          total += factorial((i % 500) + 1);
        }
        parentPort.postMessage(total);
      });
    `, { eval: true });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage([start, end]);
  });
}

async function testeCPUFatorial() {
  const numThreads = os.cpus().length;
  const intervalo = Math.floor(3_000_000 / numThreads);
  const ranges = Array.from({ length: numThreads }, (_, i) => [i * intervalo, (i + 1) * intervalo]);

  const start = performance.now();

  // Roda todos os workers paralelamente
  const resultados = await Promise.all(ranges.map(([startRange, endRange]) => runWorkerFatorial(startRange, endRange)));

  const end = performance.now();

  // resultados tem a soma parcial de cada thread
  const total = resultados.reduce((acc, val) => acc + val, 0);

  console.log("Resultado total fatorial:", total);

  return ((end - start) / 1000).toFixed(3);
}


// Teste disco - escreve e lê arquivo temporário
async function testeDiscoEmPath(mountpoint) {
  const tempDir = path.join(mountpoint, 'TempBenchmarkNode');
  const tempFile = path.join(tempDir, 'benchmark_test_file.tmp');
  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const data = Buffer.alloc(200 * 1024 * 1024, 0); // 200 MB zeros

    const startWrite = performance.now();
    fs.writeFileSync(tempFile, data);
    const endWrite = performance.now();

    const startRead = performance.now();
    fs.readFileSync(tempFile);
    const endRead = performance.now();

    fs.unlinkSync(tempFile);
    fs.rmdirSync(tempDir);

    return {
      write: ((endWrite - startWrite) / 1000).toFixed(3),
      read: ((endRead - startRead) / 1000).toFixed(3)
    };
  } catch {
    return { write: -1, read: -1 };
  }
}

async function testeTodosDiscos(disks) {
  const resultados = {};
  for (const disk of disks) {
    resultados[disk.device] = await testeDiscoEmPath(disk.mountpoint);
  }
  return resultados;
}

// Teste alocação RAM
async function testeRAMAlocacao() {
  try {
    const start = performance.now();
    const arr = new Float64Array(150_000_000);
    for (let i = 0; i < arr.length; i++) arr[i] = 1.0;
    const end = performance.now();
    return ((end - start) / 1000).toFixed(3);
  } catch {
    return Infinity;
  }
}

module.exports = {trabalhoPesado};
module.exports = {testeCPU};
module.exports = {testeCPUFatorial};
module.exports = {testeDiscoEmPath};
module.exports = {testeRAMAlocacao};
module.exports = {testeTodosDiscos};
module.exports = {runWorker};
module.exports = {runWorkerFatorial};
module.exports = {factorial};
module.exports = {trabalhoFatorial};