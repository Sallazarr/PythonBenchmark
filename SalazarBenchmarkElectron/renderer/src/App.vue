<template>
  <h1>Salazar Benchmark</h1>
  <button @click="rodarBenchmark">Executar Benchmark</button>
  <pre> {{ resultado }}</pre>
</template>

<script>
export default {
  name: "App",

  data() {
    return {
      resultado: "O resultado do benchmark vai aparecer aqui",
    };
  },

  methods: {
    async rodarBenchmark() {
      const resultadoBenchmark = await window.electronAPI.rodarBenchmark();
      this.resultado = resultadoBenchmark;
    },
  },
};
</script>

<style scoped>
* {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  margin: auto;
  max-width: 38rem;
  padding: 2rem;
}
</style>
