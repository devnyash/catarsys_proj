import { createRoot } from 'react-dom/client'
import './index.css'
// Initialise the theme (applies the saved light/dark theme before first paint).
import '@/store/themeStore'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
