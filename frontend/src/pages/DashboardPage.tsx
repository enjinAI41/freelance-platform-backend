import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useAuth } from '../context/AuthContext'
import { reportsService } from '../api/reports.service'
import type { DashboardSummary } from '../types/report'

type DashboardMetric = {
  label: string
  value: string
  accent?: 'warning' | 'success'
}

function getPrimaryRole(roles: string[]): 'CUSTOMER' | 'FREELANCER' | 'ARBITER' {
  if (roles.includes('CUSTOMER')) {
    return 'CUSTOMER'
  }

  if (roles.includes('FREELANCER')) {
    return 'FREELANCER'
  }

  return 'ARBITER'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const roles = user?.roles ?? []
  const primaryRole = getPrimaryRole(roles)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await reportsService.getDashboardSummary()
        setSummary(data)
      } catch (err) {
        if (isAxiosError(err)) {
          const apiMessage =
            (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
            (err.response?.data as { message?: string } | undefined)?.message
          setError(apiMessage ?? 'Dashboard verisi alınamadı.')
        } else {
          setError('Dashboard verisi alınamadı.')
        }
      }
      setIsLoading(false)
    }

    void loadSummary()
  }, [])

  const metrics: DashboardMetric[] = useMemo(() => {
    const projectsByStatus = summary?.projectsByStatus ?? {}
    const activeProjects =
      (projectsByStatus.ACTIVE ?? 0) + (projectsByStatus.PENDING ?? 0) + (projectsByStatus.ON_HOLD ?? 0)
    const completedProjects = projectsByStatus.COMPLETED ?? 0
    const openDisputes = summary?.openDisputes ?? 0
    const assignedDisputes = summary?.assignedOpenDisputes ?? 0
    const totalPaymentAmount = summary?.paymentSummary.totalAmount ?? 0
    const avgRating = summary?.freelancerRating.average ?? 0

    if (primaryRole === 'ARBITER') {
      return [
        { label: 'Açık Uyuşmazlık', value: String(openDisputes), accent: 'warning' },
        { label: 'Atandığım Dosya', value: String(assignedDisputes) },
        { label: 'Tamamlanan Proje', value: String(completedProjects), accent: 'success' },
      ]
    }

    if (primaryRole === 'FREELANCER') {
      return [
        { label: 'Aktif Proje', value: String(activeProjects), accent: 'success' },
        { label: 'Ortalama Puan', value: avgRating.toFixed(2) },
        { label: 'Açık Uyuşmazlık', value: String(openDisputes), accent: 'warning' },
      ]
    }

    return [
      { label: 'Aktif Proje', value: String(activeProjects), accent: 'success' },
      { label: 'Toplam Ödeme Hacmi', value: `TRY ${totalPaymentAmount.toLocaleString('tr-TR')}` },
      { label: 'Açık Uyuşmazlık', value: String(openDisputes), accent: 'warning' },
    ]
  }, [primaryRole, summary])

  const roleTitle =
    primaryRole === 'CUSTOMER'
      ? 'Müşteri Kontrol Paneli'
      : primaryRole === 'FREELANCER'
        ? 'Freelancer Kontrol Paneli'
        : 'Hakem Kontrol Paneli'

  const roleHint =
    primaryRole === 'CUSTOMER'
      ? 'İlanları yönet, teklifleri değerlendir ve proje akışlarını takip et.'
      : primaryRole === 'FREELANCER'
        ? 'Aktif işleri takip et, milestone teslimlerini ilerlet ve ödemeleri kontrol et.'
        : 'Açılan uyuşmazlıkları incele, kararlarını kaydet ve süreci kapat.'

  return (
    <section className="dashboard-stack">
      <div className="welcome-card reveal">
        <div>
          <p className="kicker-text">{roleTitle}</p>
          <h1>Hoş geldin</h1>
          <p>{roleHint}</p>
          <p className="user-meta">{user?.email ?? '-'}</p>
        </div>
        <button className="button button-subtle" onClick={handleLogout} type="button">
          Oturumu Kapat
        </button>
      </div>

      {error ? <p className="page-note">{error}</p> : null}

      <div className="stats-grid">
        {metrics.map((metric) => (
          <article className={`stat-card reveal ${metric.accent ?? ''}`.trim()} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{isLoading ? '...' : metric.value}</strong>
          </article>
        ))}
      </div>

      <div className="quick-grid">
        {primaryRole === 'CUSTOMER' ? (
          <>
            <Link className="quick-card reveal" to="/jobs/create">
              <h3>Yeni İlan Aç</h3>
              <p>Bütçe, süre ve açıklama ile yeni ilanını yayınla.</p>
            </Link>
            <Link className="quick-card reveal" to="/projects">
              <h3>Proje Takibi</h3>
              <p>Milestone durumlarını kontrol et ve teslimleri yönet.</p>
            </Link>
          </>
        ) : null}

        {primaryRole === 'FREELANCER' ? (
          <>
            <Link className="quick-card reveal" to="/projects">
              <h3>Proje Masası</h3>
              <p>Aktif işlerini ve teslim adımlarını sade görünümde yönet.</p>
            </Link>
            <Link className="quick-card reveal" to="/wallet">
              <h3>Ödeme Merkezi</h3>
              <p>Serbest bırakılan ödemeler ve transfer geçmişini takip et.</p>
            </Link>
          </>
        ) : null}

        {primaryRole === 'ARBITER' ? (
          <>
            <Link className="quick-card reveal" to="/arbiter-desk">
              <h3>Hakem Masasına Git</h3>
              <p>Aktif dosyaları inceleyip karar notlarını oluştur.</p>
            </Link>
            <Link className="quick-card reveal" to="/projects">
              <h3>Proje Kayıtları</h3>
              <p>Uyuşmazlığa bağlı proje ve milestone bağlamını hızla kontrol et.</p>
            </Link>
          </>
        ) : null}
      </div>

      <article className="quick-card reveal">
        <h3>Standart Dashboard Kaynağı</h3>
        <p>Bu ekran metrikleri tek kaynaktan: `GET /reports/dashboard-summary`.</p>
      </article>
    </section>
  )
}
