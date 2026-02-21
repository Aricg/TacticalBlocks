import { defineConfig } from 'vite';

const allowedHosts = ['fnhl.ca', 'www.fnhl.ca', 'localhost', '127.0.0.1'];

export default defineConfig({
  server: {
    allowedHosts,
  },
  preview: {
    allowedHosts,
  },
});
