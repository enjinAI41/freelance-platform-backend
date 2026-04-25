import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      if (isAxiosError(err)) {
        const apiMessage =
          (err.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message ??
          (err.response?.data as { message?: string } | undefined)?.message

        setError(apiMessage ?? 'Login basarisiz. Bilgileri kontrol et.')
        return
      }

      setError('Login basarisiz. Bilgileri kontrol et.')
    }
  }

  return (
    <section className="auth-page">
      <div className="page-card auth-card">
        <PageTitle
          title="Welcome Back"
          description="Hesabina giris yaparak dashboard'a devam et."
        />

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button className="button button-wide" type="submit">
            Login
          </button>

          {error ? <p className="alert-error">{error}</p> : null}
        </form>

        <p className="auth-switch">
          Hesabin yok mu? <Link to="/register">Kayit ol</Link>
        </p>
      </div>
    </section>
  )
}
