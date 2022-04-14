import { createApp } from 'vue'
import App from './App.vue'

const app = document.createElement('div')
app.id = 'app'
document.body.append(app)
createApp(App).mount(app)
