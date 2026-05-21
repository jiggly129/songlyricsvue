import './assets/main.css'
import './assets/bar.css'
import './assets/playlist.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router) 

app.mount('#app')
