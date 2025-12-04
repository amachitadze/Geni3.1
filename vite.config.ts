import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ეს სტრიქონი აუცილებელია, რათა Vite-მა დაინახოს REACT_APP_ პრეფიქსით დაწყებული ცვლადები
  envPrefix: ['VITE_', 'REACT_APP_'],
  build: {
    // ზრდის ფაილის ზომის ლიმიტის გაფრთხილებას 1000kb-მდე (ნაგულისხმევია 500kb)
    chunkSizeWarningLimit: 1000,
  }
});