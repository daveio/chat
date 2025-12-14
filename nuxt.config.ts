// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  css: [
    '~/assets/css/main.css',
  ],

  app: {
    head: {
      title: 'MQTT Chat Room',
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans&family=IBM+Plex+Serif&family=Space+Mono&family=JetBrains+Mono&display=swap',
        },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  tailwindcss: {
    configPath: 'tailwind.config.js',
    cssPath: '~/assets/css/main.css',
  },

  ssr: false, // Client-only app (MQTT requires browser)

  vite: {
    resolve: {
      alias: {
        '@': '/src', // Keep backwards compatibility during migration
      },
    },
  },

  alias: {
    '@': '/src',
  },
})
