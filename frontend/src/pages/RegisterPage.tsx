import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import type { RoleName } from '../types/auth'

const roleOptions: Array<{ value: RoleName; label: string; hint: string }> = [
  { value: 'CUSTOMER', label: 'Müşteri', hint: 'İlan oluştur, teklifleri değerlendir' },
  { value: 'FREELANCER', label: 'Freelancer', hint: 'Teklif ver, milestone teslim et' },
  { value: 'ARBITER', label: 'Hakem', hint: 'Uyuşmazlık sürecini yönet' },
]

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

        setError(apiMessage ?? 'Kayıt başarısız. Tekrar dene.')
        return
      }

      setError('Kayıt başarısız. Tekrar dene.')
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <h2>Freelancer</h2>
          <h1>Yeni hesabını oluştur, uygun rol ile profesyonel çalışma akışına katıl.</h1>
          <p>Müşteri, freelancer veya hakem olarak platformda kendi operasyon ekranına geçiş yap.</p>
          <div className="auth-visual">
            <div className="visual-orbit" />
            <article className="visual-card visual-card-main">
              <strong>Rol Bazlı Akış</strong>
              <span>Müşteri, Freelancer, Hakem</span>
              <div className="visual-bars">
                <i />
                <i />
                <i />
              </div>
            </article>
            <article className="visual-card visual-card-mini">
              <strong>Güvenli Çalışma</strong>
              <span>Ödeme ve teslim takibi tek panelde</span>
            </article>
          </div>
        </div>

        <div className="page-card auth-card">
          <PageTitle
            title="Yeni Hesap Oluştur"
            description="Bilgilerinizi girin, rolünüzü seçin ve kaydı tamamlayın."
          />

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="registerEmail">E-posta</label>
              <input
                id="registerEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@mail.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registerPassword">Şifre</label>
              <input
                id="registerPassword"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Şifrenizi giriniz"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registerRole">Rol</label>
              <input id="registerRole" value={role} readOnly hidden />
              <div className="auth-role-grid auth-role-grid-compact">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`role-select ${role === option.value ? 'active' : ''}`.trim()}
                    type="button"
                    onClick={() => setRole(option.value)}
                  >
                    <strong>{option.label}</strong>
                  </button>
                ))}
              </div>
            </div>

            <button className="button button-wide" type="submit">
              Kayıt Ol
            </button>

            {error ? <p className="alert-error">{error}</p> : null}
          </form>

          <p className="auth-switch">
            Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
