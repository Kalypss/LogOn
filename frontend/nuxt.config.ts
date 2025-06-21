// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    'shadcn-nuxt'
  ],

  colorMode: {
    preference: 'system', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '',
    storageKey: 'nuxt-color-mode'
  },

  css: ['~/assets/css/main.css', '@fontsource/dm-sans'],
  
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
      appName: 'LogOn Password Manager',
      version: '1.0.0'
    }
  },

  // Configuration du serveur de développement avec HTTPS
  devServer: {
    https: {
      key: './certificates/localhost-key.pem',
      cert: './certificates/localhost-cert.pem',
    },
    host: '0.0.0.0', // Permet l'accès depuis d'autres machines du réseau
    port: 3000
  },

  // Proxy configuration for API routes
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },

  vite: {
    server: {
      https: {
        key: './certificates/localhost-key.pem',
        cert: './certificates/localhost-cert.pem',
      },
      hmr: {
        port: 24678
      }
    }
  },

  ssr: true,

  typescript: {
    strict: true,
    typeCheck: false // Désactivé pour le moment pour éviter les erreurs de build
  }
})