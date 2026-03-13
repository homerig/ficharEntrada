import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base:"/ficahrEntrada/",
  plugins: [react()],
  server: {
    proxy: {
      "/api/fichar": {
        target: "https://script.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: () =>
          "/macros/s/AKfycbyizI_IxZ62tsNc6ZW2WblNTqbwDP8VRePCojAkAXGic4mzB975U_YFJa4Z1rdnPb5S/exec",
      },
    },
  },
});