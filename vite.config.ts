
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Import process from node:process to resolve the TypeScript error: Property 'cwd' does not exist on type 'Process'
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Carrega variáveis do ambiente atual e de arquivos .env
  const env = loadEnv(mode, process.cwd(), '');
  
  // Prioriza VITE_API_KEY, depois API_KEY, procurando tanto no carregamento do Vite quanto no process.env direto do Node
  const apiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || "";

  return {
    plugins: [react()],
    define: {
      // Injeta a chave de API de forma que process.env.API_KEY seja substituído pelo valor real no código do cliente
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        external: [], // Garante que as dependências do importmap sejam tratadas se necessário
      },
    },
  };
});
