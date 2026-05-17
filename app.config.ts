import { defineConfig } from "@solidjs/start/config"
import { fileURLToPath } from "url"

export default defineConfig({
  serialization: {
    mode: "json"
  },
  server: {
    esbuild: {
      options: {
        target: "esnext"
      }
    },
    handlers: [
      {
        route: "/**",
        handler: "./src/utils/security/security-headers.ts",
        middleware: true
      }
    ]
  },
  vite: {
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    ssr: {
      external: ["bun", "bun:sqlite"]
    },
    build: {
      rollupOptions: {
        external: ["bun", "bun:sqlite"]
      }
    },
    esbuild: {
      target: "esnext"
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext"
      }
    }
  }
})
