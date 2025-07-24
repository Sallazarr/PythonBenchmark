<template>
  <v-dialog scrollable>
    <v-card>
      <v-card-title class="text-h5"> Relatório de Benchmark </v-card-title>

      <v-card-text>
        <v-expansion-panels>
          <v-expansion-panel
            v-for="(valor, chave) in benchmarkData"
            :key="chave"
          >
            <v-expansion-panel-title class="font-weight-bold">
              {{ chave }}
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <!-- se o a chave for um array -->
              <div v-if="Array.isArray(valor)">
                <dl>
                  <template v-for="(item, index) in valor" :key="index">
                    <div
                      v-for="(valorPropriedade, nomePropriedade) in item"
                      :key="nomePropriedade"
                      class="d-flex justify-space-between"
                    >
                      <dt>
                        <strong>{{ nomePropriedade }}</strong>
                      </dt>
                      <dd>{{ valorPropriedade }}</dd>
                    </div>
                  </template>
                </dl>
              </div>

              <!-- se a chave for um objeto -->
              <div v-else-if="typeof valor === 'object' && valor !== null">
                <dl>
                  <div
                    v-for="(valorPropriedade, nomePropriedade) in valor"
                    :key="nomePropriedade"
                    class="d-flex justify-space-between"
                  >
                    <dt>
                      <strong>{{ nomePropriedade }}:</strong>
                    </dt>
                    <dd>{{ valorPropriedade }}</dd>
                  </div>
                </dl>
              </div>
              <p v-else>{{ valor }}</p>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="$emit('close')">Fechar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    benchmarkData: {
      type: Object,
      required: true,
    },
  },

  emits: ['close']
};
</script>
