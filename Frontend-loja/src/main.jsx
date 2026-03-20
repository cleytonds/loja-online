import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { CarrinhoProvider } from './context/CarrinhoContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

    <CarrinhoProvider>
      <App />
    </CarrinhoProvider>

  </React.StrictMode>
)