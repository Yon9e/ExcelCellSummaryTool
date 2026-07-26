import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles.css";
import "./styles/v3-tokens.css";
import "./styles/v3-shell.css";
import "./styles/v3-motion.css";
import "./styles/v3-workspaces.css";

createApp(App).use(createPinia()).mount("#root");
