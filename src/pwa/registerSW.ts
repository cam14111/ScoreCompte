import { registerSW as registerServiceWorker } from 'virtual:pwa-register'

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
let isUpdateModalShown = false

/**
 * Shows the version update modal when a new version is available
 */
function showUpdateAvailableModal(): void {
  if (isUpdateModalShown) return
  isUpdateModalShown = true

  // Create modal container
  const overlay = document.createElement('div')
  overlay.id = 'version-update-modal'
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.8);
    animation: fadeIn 0.2s ease-out;
  `

  // Create modal content
  const modal = document.createElement('div')
  modal.style.cssText = `
    background-color: hsl(222.2, 84%, 4.9%);
    border: 1px solid hsl(217.2, 32.6%, 17.5%);
    border-radius: 0.75rem;
    padding: 1.5rem;
    max-width: 24rem;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease-out;
  `

  // Check for light theme
  const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light'
  if (isLightTheme) {
    modal.style.backgroundColor = 'hsl(0, 0%, 100%)'
    modal.style.border = '1px solid hsl(214.3, 31.8%, 91.4%)'
  }

  // Header with icon
  const header = document.createElement('div')
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  `

  // Icon container
  const iconContainer = document.createElement('div')
  iconContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    background-color: hsl(217.2, 91.2%, 59.8%, 0.1);
    flex-shrink: 0;
  `

  // SVG icon (refresh/update icon)
  iconContainer.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(217.2, 91.2%, 59.8%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
  `

  // Title
  const title = document.createElement('h2')
  title.textContent = 'Nouvelle version disponible'
  title.style.cssText = `
    font-size: 1.125rem;
    font-weight: 600;
    color: ${isLightTheme ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(210, 40%, 98%)'};
    margin: 0;
  `

  header.appendChild(iconContainer)
  header.appendChild(title)

  // Message
  const message = document.createElement('p')
  message.textContent = 'Une nouvelle version de l\'application est disponible. Cliquez sur le bouton ci-dessous pour la charger.'
  message.style.cssText = `
    font-size: 0.875rem;
    color: ${isLightTheme ? 'hsl(215.4, 16.3%, 46.9%)' : 'hsl(215, 20.2%, 65.1%)'};
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  `

  // Button container
  const buttonContainer = document.createElement('div')
  buttonContainer.style.cssText = `
    display: flex;
    gap: 0.75rem;
  `

  // Later button
  const laterButton = document.createElement('button')
  laterButton.textContent = 'Plus tard'
  laterButton.style.cssText = `
    flex: 1;
    padding: 0.75rem 1rem;
    background-color: transparent;
    color: ${isLightTheme ? 'hsl(215.4, 16.3%, 46.9%)' : 'hsl(215, 20.2%, 65.1%)'};
    border: 1px solid ${isLightTheme ? 'hsl(214.3, 31.8%, 91.4%)' : 'hsl(217.2, 32.6%, 17.5%)'};
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  `
  laterButton.onmouseover = () => {
    laterButton.style.backgroundColor = isLightTheme ? 'hsl(210, 40%, 96.1%)' : 'hsl(217.2, 32.6%, 17.5%)'
  }
  laterButton.onmouseout = () => {
    laterButton.style.backgroundColor = 'transparent'
  }
  laterButton.onclick = () => {
    overlay.remove()
    isUpdateModalShown = false
  }

  // Update button
  const updateButton = document.createElement('button')
  updateButton.textContent = 'Mettre à jour'
  updateButton.style.cssText = `
    flex: 1;
    padding: 0.75rem 1rem;
    background-color: hsl(217.2, 91.2%, 59.8%);
    color: hsl(222.2, 47.4%, 11.2%);
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  `
  updateButton.onmouseover = () => {
    updateButton.style.backgroundColor = 'hsl(217.2, 91.2%, 50%)'
  }
  updateButton.onmouseout = () => {
    updateButton.style.backgroundColor = 'hsl(217.2, 91.2%, 59.8%)'
  }
  updateButton.onclick = async () => {
    updateButton.textContent = 'Mise à jour...'
    updateButton.style.opacity = '0.7'
    updateButton.style.cursor = 'not-allowed'

    if (updateSW) {
      await updateSW(true)
    } else {
      window.location.reload()
    }
  }

  buttonContainer.appendChild(laterButton)
  buttonContainer.appendChild(updateButton)

  // Assemble modal
  modal.appendChild(header)
  modal.appendChild(message)
  modal.appendChild(buttonContainer)
  overlay.appendChild(modal)

  // Add animations if not already present
  if (!document.getElementById('update-modal-styles')) {
    const style = document.createElement('style')
    style.id = 'update-modal-styles'
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `
    document.head.appendChild(style)
  }

  // Add to DOM
  document.body.appendChild(overlay)

  // Focus update button for accessibility
  updateButton.focus()
}

/**
 * Registers the service worker and sets up update detection
 */
export function registerSW(): void {
  if ('serviceWorker' in navigator) {
    updateSW = registerServiceWorker({
      immediate: true,
      onNeedRefresh() {
        // New version available - show update modal
        showUpdateAvailableModal()
      },
      onOfflineReady() {
        // App is ready for offline use - could show a toast here
        console.log('App ready for offline use')
      },
      onRegistered(registration) {
        // Check for updates periodically (every 30 minutes)
        if (registration) {
          setInterval(() => {
            registration.update()
          }, 30 * 60 * 1000)
        }
      },
      onRegisterError(error) {
        console.error('Service worker registration error:', error)
      }
    })
  }
}
