import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ეს სტრიქონი აუცილებელია, რათა Vite-მა დაინახოს REACT_APP_ პრეფიქსით დაწყებული ცვლადები
  envPrefix: ['VITE_', 'REACT_APP_'],
});
