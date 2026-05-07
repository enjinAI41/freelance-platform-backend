import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import type { RoleName } from '../types/auth'

const roleOptions: Array<{ value: RoleName; label: string; hint: string }> = [
  { value: 'CUSTOMER', label: 'Müşteri', hint: 'İlan yayınla ve proje yönet' },
  { value: 'FREELANCER', label: 'Freelancer', hint: 'İlanlara teklif ver ve teslim yap' },
  { value: 'ARBITER', label: 'Hakem', hint: 'Uyuşmazlıkları değerlendir' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<RoleName>('CUSTOMER')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      const session = await login(email, password)
      const userRoles = session.user.roles ?? []
      if (!userRoles.includes(selectedRole)) {
        logout()
        setError(`Bu hesapta ${selectedRole} rolü yok. Lütfen doğru rolü seç.`)
        return
      }
      navigate(selectedRole === 'ARBITER' ? '/arbiter-desk' : '/dashboard')
    } catch (err) {
      if (isAxiosError(err)) {
        const apiMessage =
          (err.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message ??
          (err.response?.data as { message?: string } | undefined)?.message

        setError(apiMessage ?? 'Giriş başarısız. Bilgileri kontrol et.')
        return
      }

      setError('Giriş başarısız. Bilgileri kontrol et.')
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <h2>Freelancer</h2>
          <h1>Freelance işlerini kolayca yönet, projelerini tek yerden takip et.</h1>
          <p>Müşteriler ve freelancerlar için güvenli, hızlı ve profesyonel bir çalışma ortamı.</p>
          <div className="auth-visual">
            <div className="visual-orbit" />
            <article className="visual-card visual-card-main">
              <strong>Aktif Projeler</strong>
              <span>12 proje yönetiliyor</span>
              <div className="visual-bars">
                <i />
                <i />
                <i />
              </div>
            </article>
            <article className="visual-card visual-card-mini">
              <strong>Bugünkü Teslim</strong>
              <span>3 aşama bekliyor</span>
            </article>
          </div>
        </div>

        <div className="page-card auth-card">
          <PageTitle
            title="Hoş Geldiniz"
            description="Hesabınıza giriş yaparak devam edin."
          />

          <div className="auth-role-grid auth-role-grid-compact">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                className={`role-select ${selectedRole === option.value ? 'active' : ''}`.trim()}
                type="button"
                onClick={() => setSelectedRole(option.value)}
              >
                <strong>{option.label}</strong>
              </button>
            ))}
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@mail.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Şifre</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Şifrenizi giriniz"
                required
              />
            </div>

            <button className="button button-wide" type="submit">
              Giriş Yap
            </button>

            {error ? <p className="alert-error">{error}</p> : null}
          </form>

          <p className="auth-switch">
            Hesabın yok mu? <Link to="/register">Kayıt olun</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
