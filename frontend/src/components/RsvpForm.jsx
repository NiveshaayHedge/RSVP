import { useRef, useState } from 'react'
import { api } from '../api.js'
import { burst } from '../effects.js'
import { PARTY_OPTIONS } from '../event.js'

// The guest's own RSVP is remembered on this device so "Change my RSVP" can reopen it.
const KEY = 'niveshaay_rsvp_20261020'

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

function formFrom(saved) {
  return {
    name: saved?.name || '',
    phone: saved?.phone || '',
    guests: saved?.guests ? String(saved.guests) : '',
  }
}

export default function RsvpForm() {
  const [saved, setSaved] = useState(loadSaved)
  const [form, setForm] = useState(() => formFrom(saved))
  const [done, setDone] = useState(Boolean(saved && saved.name))
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const nameRef = useRef(null)
  const phoneRef = useRef(null)
  const guestsRef = useRef(null)
  const submitRef = useRef(null)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    const phone = form.phone.trim()
    if (!name) {
      setError('Please add your name.')
      nameRef.current?.focus()
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Please add a phone number with at least 10 digits.')
      phoneRef.current?.focus()
      return
    }
    if (!form.guests) {
      setError('Please choose how many people are attending.')
      guestsRef.current?.focus()
      return
    }
    setError('')
    burst(submitRef.current)
    setSending(true)
    try {
      const payload = { name, phone, guests: Number(form.guests) }
      if (saved?.phone) payload.previousPhone = saved.phone
      await api.submitRsvp(payload)
      const next = { name, phone, guests: Number(form.guests), savedAt: new Date().toISOString() }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* private mode: the RSVP is still saved on the server */
      }
      setSaved(next)
      setDone(true)
    } catch (err) {
      setError(
        err.status === 0
          ? 'Your RSVP did not go through. Check your connection and press Send RSVP again.'
          : err.message || 'Your RSVP did not go through. Please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  function edit() {
    setDone(false)
    setTimeout(() => nameRef.current?.focus(), 0)
  }

  if (done) {
    const first = saved?.name ? saved.name.split(' ')[0] + ', y' : 'Y'
    return (
      <div className="done">
        <div className="tick">✓</div>
        <h4>See you on the 20th.</h4>
        <p>{first}our RSVP is in. We'll share any updates on the number you gave us.</p>
        <button className="btn out" type="button" onClick={edit}>
          Change my RSVP
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="name">
          Name <span className="req">*</span>
        </label>
        <input
          ref={nameRef}
          type="text"
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Your full name"
          maxLength={80}
          value={form.name}
          onChange={update('name')}
        />
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="phone">
            Phone <span className="req">*</span>
          </label>
          <input
            ref={phoneRef}
            type="tel"
            id="phone"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+91 98xxx xxxxx"
            maxLength={20}
            value={form.phone}
            onChange={update('phone')}
          />
        </div>
        <div className="field">
          <label htmlFor="guests">
            Attending <span className="req">*</span>
          </label>
          <select ref={guestsRef} id="guests" name="guests" value={form.guests} onChange={update('guests')}>
            <option value="" disabled>
              Select
            </option>
            {PARTY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="err" role="alert">
        {error}
      </div>
      <div>
        <button ref={submitRef} className="btn" type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send RSVP →'}
        </button>
      </div>
    </form>
  )
}
