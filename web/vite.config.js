import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// En dev (npm run dev), on proxifie /api et /ws vers l'API Flask locale.
// En prod (build Docker), c'est nginx qui fait ce même travail — voir
// nginx.conf — donc le code React n'a jamais besoin de connaître l'URL
// de l'API : il utilise toujours des chemins relatifs.
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": "http://localhost:5000",
            "/ws": {
                target: "ws://localhost:5000",
                ws: true,
            },
        },
    },
});
