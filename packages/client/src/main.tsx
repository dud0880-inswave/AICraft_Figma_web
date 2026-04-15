import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Spec from './Spec'
import { ThemeProvider } from './contexts/ThemeContext'
import { loadConfig } from './config'
import './index.css'

const isSpecPage = window.location.pathname === '/spec'

loadConfig().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        {isSpecPage ? <Spec /> : <App />}
      </ThemeProvider>
    </React.StrictMode>,
  )
})
