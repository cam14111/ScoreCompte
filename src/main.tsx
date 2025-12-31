import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './app/router'
import { AlertProvider } from './contexts/AlertContext'
import { settingsStore } from './state/settingsStore'
import { registerSW } from './pwa/registerSW'
import { initializePredefinedModels } from './data/initialization'
import './index.css'

// Initialize settings (theme, contrast)
settingsStore.init()

// Initialize predefined game models
initializePredefinedModels()

// Register service worker for PWA
registerSW()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AlertProvider>
      <RouterProvider router={router} />
    </AlertProvider>
  </React.StrictMode>,
)
