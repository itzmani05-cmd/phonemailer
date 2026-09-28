import App from './App.tsx'
import { useToken } from './auth/session'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TermsPage } from './pages/TermsPage'

function Mailbox() {
  const token = useToken()
  return token ? <App key={token} /> : <LoginPage />
}

export function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/register') return <RegisterPage />
  if (path === '/terms') return <TermsPage />
  return <Mailbox />
}
