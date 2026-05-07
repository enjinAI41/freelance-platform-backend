import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { jobsService } from '../api/jobs.service'
import { PageTitle } from '../components/PageTitle'

export function CreateJobPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [category, setCategory] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [deadlineDays, setDeadlineDays] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const parsedBudget = Number(budget)
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setError('Bütçe geçerli bir sayı olmalı.')
      return
    }

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const parsedDeadlineDays = deadlineDays.trim() ? Number(deadlineDays) : undefined

    if (parsedDeadlineDays !== undefined && (!Number.isInteger(parsedDeadlineDays) || parsedDeadlineDays < 1)) {
      setError('Teslim süresi geçerli bir gün sayısı olmalı.')
      return
    }

    try {
      await jobsService.create({
        title,
        description,
        budget: parsedBudget,
        category: category.trim() || undefined,
        skills: skills.length > 0 ? skills : undefined,
        deadlineDays: parsedDeadlineDays,
      })
      navigate('/jobs')
    } catch (err) {
      if (isAxiosError(err)) {
        const apiMessage =
          (err.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message ??
          (err.response?.data as { message?: string } | undefined)?.message

        setError(apiMessage ?? 'İlan oluşturulamadı.')
        return
      }

      setError('İlan oluşturulamadı.')
    }
  }

  return (
    <section className="page-card centered-form-card">
      <PageTitle
        title="Yeni İş İlanı Oluştur"
        description="Proje kapsamı, bütçe ve beklentiyi netleştirerek nitelikli freelancer teklifleri topla."
      />

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="jobTitle">İlan Başlığı</label>
          <input
            id="jobTitle"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Örnek: E-ticaret sitesi için React arayüz geliştirme"
            required
            maxLength={180}
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobDescription">İlan Açıklaması</label>
          <textarea
            id="jobDescription"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Teslim kapsamını, teknik beklentiyi, hedef tarihi ve revizyon politikasını yaz."
            required
            rows={5}
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobBudget">Toplam Bütçe (TRY)</label>
          <input
            id="jobBudget"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            type="number"
            min={0}
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobCategory">Kategori</label>
          <input
            id="jobCategory"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Örnek: UI/UX, Backend, Mobil..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobSkills">Yetenek / Teknolojiler</label>
          <input
            id="jobSkills"
            value={skillsInput}
            onChange={(event) => setSkillsInput(event.target.value)}
            placeholder="Virgülle ayır: React, NestJS, PostgreSQL"
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobDeadlineDays">Teslim Süresi (Gün)</label>
          <input
            id="jobDeadlineDays"
            value={deadlineDays}
            onChange={(event) => setDeadlineDays(event.target.value)}
            type="number"
            min={1}
            placeholder="Örnek: 30"
          />
        </div>

        <button className="button" type="submit">
          İlanı Yayınla
        </button>

        {error ? <p className="page-note">{error}</p> : null}
      </form>
    </section>
  )
}
