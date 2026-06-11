import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const theme = localStorage.getItem('kelabsukan-theme')
const prefersDark = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)').matches
  : false
const initialTheme = theme === 'light' || theme === 'dark' ? theme : (prefersDark ? 'dark' : 'light')

document.documentElement.classList.toggle('dark', initialTheme === 'dark')
document.documentElement.dataset.theme = initialTheme

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
