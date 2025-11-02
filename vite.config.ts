import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
   server: {
     host: "::",
     port: 8080,
     proxy: {
       '/api/crypto-prices': {
         target: 'https://nof1.ai',
         changeOrigin: true,
         secure: false,
         rewrite: (path) => path.replace(/^\/api\/crypto-prices/, '/api/crypto-prices'),
       },
       '/api/wallex': {
         target: 'https://api.wallex.ir',
         changeOrigin: true,
         secure: true,
         rewrite: (path) => path.replace(/^\/api\/wallex/, ''),
         configure: (proxy, options) => {
           proxy.on('error', (err, req, res) => {
             console.log('proxy error', err);
           });
           proxy.on('proxyReq', (proxyReq, req, res) => {
             console.log('Sending Request to Wallex:', req.method, req.url);
           });
           proxy.on('proxyRes', (proxyRes, req, res) => {
             console.log('Received Response from Wallex:', proxyRes.statusCode, req.url);
           });
         },
       }
     }
   },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));