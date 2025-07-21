<template>
  <v-container fluid class="fill-height">
    <v-row>
      <!-- divide a pagina inciaal em 2 colunas -->
      <v-col
        v-for="(btn, index) in propriedadesBotoes"
        :key="index"
        cols="6"
        class="d-flex justify-center align-center"
      >
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

    <!-- modal pra mostrar o resultado do benchmark -->
    <v-dialog v-model="mostrarResultado" max-width="700">
      <v-card>

        <v-card-title class="text-h5">Resultado do Benchmark</v-card-title>

        <v-card-text>
          <v-data-table class="elevation-1" dense hide-default-footer />
          <!-- mudar isso aqui quando o henrique mandar o result como json !!!!!!!!!!!! -->
          <h3>Aqui em cima colocar os dados do benchmark</h3>
          <pre>{{ resultado }}</pre>
        </v-card-text>

        <v-card-actions>

          <v-spacer />

          <v-btn color="primary" @click="mostrarResultado = false">
            Fechar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      mostrarResultado: false,
      resultado: "",
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
      // AQUI EU VOU MUDAR DEPOIS PRA PERSONALIZAR AS FUNCOES DE CADA BOTAO
      await this.rodarBenchmark();
      this.mostrarResultado = true; //abre o modal
      this.loadingIndex = null;
    },

    async rodarBenchmark() {
      const resultadoBenchmark = await window.electronAPI.rodarBenchmark();
      this.resultado = resultadoBenchmark;
      console.log(this.resultado);
    },
  },
};
</script>
