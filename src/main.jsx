import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ConstructorRouter from './ConstructorRouter.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConstructorRouter />
  </StrictMode>,
)
