<template>
  <v-dialog scrollable>
    <v-card>
      <v-card-title class="text-h5">
        Relatório de Benchmark
      </v-card-title>

      <v-card-text>
        <v-expansion-panels>
          <v-expansion-panel
            v-for="(valor, chave) in benchmarkData" :key="chave"
          >
            <v-expansion-panel-title class="font-weight-bold">
              {{ chave }}
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div v-if="Array.isArray(valor)">
                <ul>
                </ul>
              </div>
              <div v-else-if="typeof valor === 'object' && valor !== null">
                <dl>
                  <li v-for="(value, key) in valor" :key="key">
                    <dt style="background-color: aqua;">{{ key }}</dt>
                    <dd>{{ value }}</dd>
                  </li>
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
      required: true
    }
  },
}
</script>