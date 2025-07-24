<template>
  <v-container fluid class="fill-height">
    <v-row>
      <!-- divide a pagina inciaal em 2 colunas -->
      <v-col v-for="(btn, index) in propriedadesBotoes" :key="index" cols="6"
        class="d-flex justify-center align-center">
        <!-- o laço exibe os botoes de acordo com os dados do array 'botoes' -->
        <v-btn
          width="100%"
          height="180"
          stacked
          :color="btn.color"
          :loading="loadingIndex === index"
          @click="() => handleClick(index)"
        >

          <template v-slot:prepend>
            <v-icon :icon="btn.icon" size="70" />
          </template>

          {{ btn.text }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Componente que vai mostrar os dados do benchmark -->
    <DialogBenchmark v-model="mostrarResultado" :benchmarkData="resultado" @close="mostrarResultado = false"/>
  </v-container>
</template>

<script>
import DialogBenchmark from '@/components/DialogBenchmark.vue';

export default {
  components: {
    DialogBenchmark
  },

  data() {
    return {
      mostrarResultado: false,
      resultado: {},
      loadingIndex: null,
      propriedadesBotoes: [
        { text: "benchmark", icon: "mdi-chart-line", color: "#fa4f16" },
        { text: "instalar payer", icon: "mdi-download-box-outline", color: "#c1c1c1" },
        { text: "sei la", icon: "mdi-cog", color: "#e62c5a" },
        { text: "vai saber", icon: "mdi-help-circle", color: "#f15d75" },
      ],
      benchmarkData: {
        "Sistema Operacional": {
          "Sistema": "Windows",
          "Versão": "10.0.26100",
          "Release": "11",
          "Arquitetura": "64bit",
          "Uptime": "10 days, 20:59:55",
          "Data BIOS": "2025-03-05",
          "Windows": "Microsoft Windows 11 Home Single Language",
          "Versão Windows": "10.0.26100",
          "Tipo de Máquina": "Outro"
        },
        "CPU": {
          "name": "11th Gen Intel(R) Core(TM) i3-1115G4 @ 3.00GHz",
          "cores": 2,
          "threads": 4,
          "freq": 2995,
          "Tempo teste soma quadrados": 0.736,
          "Tempo teste fatorial": 0.049
        },
        "RAM": {
          "total": 7.74,
          "used": 7.14,
          "available": 0.6,
          "percent": 92.2,
          "Tempo alocação RAM": 0.405
        },
        "Discos": [
          {
            "device": "C:\\",
            "mountpoint": "C:\\",
            "fstype": "NTFS",
            "total": 217.11,
            "free": 72.37,
            "used_percent": 66.7
          }
        ],
        "Tempos Discos": {
          "C:\\": {
            "write": 0.344,
            "read": 0.21
          }
        },
        "Placa Mãe": {
          "Fabricante": "Dell Inc.",
          "Modelo": "03DJ8T"
        },
        "Portas USB": [
          "Intel(R) USB 3.10 eXtensible Host Controller - 1.20 (Microsoft)"
        ],
        "Dispositivos USB": [
          "USB Composite Device",
          "Dispositivo Serial USB (COM8)",
          "Intel(R) Wireless Bluetooth(R)",
          "USB PnP Sound Device",
          "Goodix MOC Fingerprint",
          "USB Root Hub (USB 3.0)",
          "Integrated Webcam",
          "Dispositivo de Entrada USB"
        ],
        "Erros": [
          "Sistema operacional não é versão Pro: Microsoft Windows 11 Home Single Language",
          "Recomendado usar máquina Desktop, detectado: Outro"
        ],
        "Pontuações": {
          "CPU": 10,
          "RAM": 9.84,
          "Disco": 10.0,
          "Final": 9.94
        }
      }
    };
  },

  methods: {
    async handleClick(index) {
      this.loadingIndex = index;
      this.resultado = this.benchmarkData;
      this.mostrarResultado = true; //abre o modal
      this.loadingIndex = null;
      console.log(this.resultado);
      // AQUI EU VOU MUDAR DEPOIS PRA PERSONALIZAR AS FUNCOES DE CADA BOTAO
      //await this.rodarBenchmark();
      //this.mostrarResultado = true; //abre o modal
    },

    async rodarBenchmark() {
      const resultadoBenchmark = await window.electronAPI.rodarBenchmark();
      this.resultado = resultadoBenchmark;
      console.log(this.resultado);
    },
  },
};
</script>
