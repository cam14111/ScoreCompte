/**
 * Version Update Handler
 *
 * Detects when dynamic imports fail due to version updates (old chunks no longer exist)
 * and shows a friendly modal prompting the user to reload the application.
 */

let isUpdateModalShown = false

/**
 * Checks if an error is a dynamic import failure (typically caused by version updates)
 */
function isDynamicImportError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('loading chunk') ||
      message.includes('loading css chunk') ||
      message.includes('dynamically imported module')
    )
  }
  return false
}

/**
 * Creates and shows the version update modal
 */
function showVersionUpdateModal(): void {
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

  // SVG icon (info icon)
  iconContainer.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(217.2, 91.2%, 59.8%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
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

  // Button
  const button = document.createElement('button')
  button.textContent = 'Mettre à jour'
  button.style.cssText = `
    width: 100%;
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
  button.onmouseover = () => {
    button.style.backgroundColor = 'hsl(217.2, 91.2%, 50%)'
  }
  button.onmouseout = () => {
    button.style.backgroundColor = 'hsl(217.2, 91.2%, 59.8%)'
  }
  button.onclick = () => {
    window.location.reload()
  }

  // Assemble modal
  modal.appendChild(header)
  modal.appendChild(message)
  modal.appendChild(button)
  overlay.appendChild(modal)

  // Add animations
  const style = document.createElement('style')
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

  // Add to DOM
  document.body.appendChild(overlay)

  // Focus button for accessibility
  button.focus()
}

/**
 * Initializes the version update handler
 * Should be called early in the application lifecycle
 */
export function initVersionUpdateHandler(): void {
  // Handle unhandled promise rejections (catches dynamic import failures)
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (isDynamicImportError(event.reason)) {
      event.preventDefault()
      showVersionUpdateModal()
    }
  })

  // Handle regular errors as fallback
  window.addEventListener('error', (event: ErrorEvent) => {
    if (isDynamicImportError(event.error)) {
      event.preventDefault()
      showVersionUpdateModal()
    }
  })
}
