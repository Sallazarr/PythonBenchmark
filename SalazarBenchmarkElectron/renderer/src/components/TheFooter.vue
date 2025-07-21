<template>
  <v-footer color="grey-lighten-4" class="d-flex justify-center align-center">
      <p class="text-center">
        &copy; {{ ano }} <br>
        <strong style="color: #707070;">Desenvolvido por Suporte Payer</strong>
      </p>
  </v-footer>
</template>

<script>
export default {
  name: "TheFooter",

  data() {
    return {
      ano: new Date().getFullYear(),
    };
  },
};
</script>
