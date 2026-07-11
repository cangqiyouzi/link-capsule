import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'
import { TRPCProvider } from '@/providers/trpc'
import { HealthCheckProvider } from '@/providers/health-check'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <TRPCProvider>
      <HealthCheckProvider>
        <App />
        <Toaster theme="dark" position="top-center" />
      </HealthCheckProvider>
    </TRPCProvider>
  </BrowserRouter>
)
