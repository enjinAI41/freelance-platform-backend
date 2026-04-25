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
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const parsedBudget = Number(budget)
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setError('Budget gecerli bir sayi olmali.')
      return
    }

    try {
      await jobsService.create({
        title,
        description,
        budget: parsedBudget,
      })
      navigate('/jobs')
    } catch (err) {
      if (isAxiosError(err)) {
        const apiMessage =
          (err.response?.data as { error?: { message?: string } } | undefined)
            ?.error?.message ??
          (err.response?.data as { message?: string } | undefined)?.message

        setError(apiMessage ?? 'Job olusturulamadi.')
        return
      }

      setError('Job olusturulamadi.')
    }
  }

  return (
    <section className="page-card centered-form-card">
      <PageTitle title="Create Job" description="Yeni is ilani olustur" />

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="jobTitle">Title</label>
          <input
            id="jobTitle"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={180}
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobDescription">Description</label>
          <textarea
            id="jobDescription"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={5}
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobBudget">Budget</label>
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

        <button className="button" type="submit">
          Create Job
        </button>

        {error ? <p className="page-note">{error}</p> : null}
      </form>
    </section>
  )
}
