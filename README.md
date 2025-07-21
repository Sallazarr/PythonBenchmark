## Como rodar o projeto em modo dev

### Pré-requisitos
- **Node.js** (versão 16+)
- **Python** (versão 3.7+)
- **Windows** (o benchmark é específico para Windows)

### Instalação e Execução

#### 1. Clone e entre na pasta principal
```bash
cd SalazarBenchmarkElectron
```

#### 2. Instale as dependências do Electron
```bash
npm install
```

#### 3. Instale as dependências do Vue
```bash
cd renderer
npm install
cd ..
```

#### 4. Instale as dependências Python
```bash
cd Python
pip install psutil wmi numpy
cd ..
```

#### 5. Rode o projeto
```bash
npm run dev
```

### O que acontece:
- Abre uma janela Electron com interface Vue
- 4 botões grandes na tela inicial
- Botão "benchmark" executa o script Python
- Resultado aparece em um modal

### 📁 Estrutura do Projeto:
```
SalazarBenchmarkElectron/
├── index.js              # Main process Electron
├── preload.js            # Bridge entre Electron e Vue
├── renderer/             # Frontend Vue + Vuetify
│   ├── src/
│   └── package.json
├── python_bin/           # Executável do benchmark
│   └── SalazarBenchmark.exe
└── Python/               # Código fonte Python
    └── benchmark.py
```

### ⚠️ Pontos Importantes:
- **Windows obrigatório** (usa WMI)
- **Executável já compilado** em `python_bin/`
- **Resultado em texto** (não JSON ainda)

### 🛠️ Comandos Úteis:
```bash
npm run dev          # Desenvolvimento completo
npm run make         # Build do executável
npm run vue:serve    # Só o frontend Vue
npm run vue:build    # Build do frontend
```

### 🐛 Solução de Problemas:
- **Erro Python**: Verifique se `psutil`, `wmi` e `numpy` estão instalados
- **Erro Electron**: Verifique se Node.js está atualizado
- **Erro Vue**: Delete `node_modules` e rode `npm install` novamente

**A primeira execução em modo dev demora um poquinho**

---
