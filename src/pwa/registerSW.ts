export function registerSW() {
  if ('serviceWorker' in navigator) {
    // The service worker will be automatically registered by vite-plugin-pwa
    // This file is for any custom SW registration logic if needed

    window.addEventListener('load', () => {
      // Listen for updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Optionally show a toast notification that the app has been updated
        console.log('App updated! Please reload.')
      })
    })
  }
}
