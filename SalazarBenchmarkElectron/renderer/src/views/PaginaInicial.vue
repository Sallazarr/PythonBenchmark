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
    };
  },

  methods: {
    async handleClick(index) {
      this.loadingIndex = index;
        await this.rodarBenchmark();
      //this.resultado = this.benchmarkData;
      this.mostrarResultado = true; //abre o modal
      this.loadingIndex = null;
      console.log(this.resultado);
      // AQUI EU VOU MUDAR DEPOIS PRA PERSONALIZAR AS FUNCOES DE CADA BOTAO

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
