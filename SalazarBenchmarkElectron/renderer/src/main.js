import { createApp } from 'vue'
import { vuetify } from './plugins/vuetify'
import '@mdi/font/css/materialdesignicons.css' //CSS da biblioteca de ícones
import App from './App.vue'

createApp(App).use(vuetify).mount('#app')
