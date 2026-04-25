import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import type { RoleName } from '../types/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RoleName>('CUSTOMER')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await register(email, password, role)
      navigate('/login')
    } catch (err) {
      if (isAxiosError(err)) {
        const apiMessage =
          (err.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message ??
          (err.response?.data as { message?: string } | undefined)?.message

        setError(apiMessage ?? 'Kayit basarisiz. Tekrar dene.')
        return
      }

      setError('Kayit basarisiz. Tekrar dene.')
    }
  }

  return (
    <section className="auth-page">
      <div className="page-card auth-card">
        <PageTitle
          title="Create Account"
          description="Yeni hesap olustur ve freelance paneline katil."
        />

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="registerEmail">Email</label>
            <input
              id="registerEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerPassword">Password</label>
            <input
              id="registerPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerRole">Role</label>
            <select
              id="registerRole"
              value={role}
              onChange={(event) => setRole(event.target.value as RoleName)}
            >
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="FREELANCER">FREELANCER</option>
              <option value="ARBITER">ARBITER</option>
            </select>
          </div>

          <button className="button button-wide" type="submit">
            Register
          </button>

          {error ? <p className="alert-error">{error}</p> : null}
        </form>

        <p className="auth-switch">
          Zaten hesabin var mi? <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  )
}
