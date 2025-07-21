<template>
  <v-app>
    <TheAppBar />
    <v-main>
      <PaginaInicial />
    </v-main>
    <TheFooter />
  </v-app>
</template>

<script>
import PaginaInicial from "./views/PaginaInicial.vue";
import TheAppBar from "./components/TheAppBar.vue";
import TheFooter from "./components/TheFooter.vue";

export default {
  name: "App",
  components: {
    PaginaInicial,
    TheAppBar,
    TheFooter,
  },
};
</script>
<style>
* {
  font-family: "Poppins", sans-serif;
}
</style>
