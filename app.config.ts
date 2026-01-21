import { defineConfig } from "@solidjs/start/config"
import { fileURLToPath } from "url"

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./src", import.meta.url))
      }
    }
  }
})