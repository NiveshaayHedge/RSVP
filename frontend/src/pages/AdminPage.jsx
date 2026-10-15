import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import Closing from '../components/Closing.jsx'

const fmt = (iso) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const timeNow = () => new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })

export default function AdminPage() {
  const [view, setView] = useState('checking') // checking | login | dash

  useEffect(() => {
    api
      .session()
      .then((d) => setView(d.authenticated ? 'dash' : 'login'))
      .catch(() => setView('login'))
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* the cookie is cleared server-side; nothing else to do */
    }
    setView('login')
  }, [])

  return (
    <div className="adminWrap">
      <header className="bar">
        <div className="in">
          <a className="logo" href="/" aria-label="Back to the invitation">
            <img src="/logo.png" alt="Niveshaay" width="375" height="142" />
          </a>
          <div className="right">
            <span className="kicker gold">Office opening · Admin</span>
            {view === 'dash' && (
              <button className="btn ghost sm" type="button" onClick={signOut}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="in adminMain">
        {view === 'login' && <Login onSuccess={() => setView('dash')} />}
        {view === 'dash' && <GuestList onUnauthenticated={() => setView('login')} />}
      </main>

      <Closing />
    </div>
  )
}

function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!password) {
      setError('Please enter the password.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await api.login(password)
      setPassword('')
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="loginWrap">
      <div className="card">
        <div className="role">Admin access</div>
        <h3>Guest list for 20 October</h3>
        <p className="hint">Enter the admin password to see who has RSVP'd.</p>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input
              type="password"
              id="pw"
              name="password"
              autoComplete="current-password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="err" role="alert">
            {error}
          </div>
          <div>
            <button className="btn" type="submit" disabled={busy}>
              Sign in →
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function GuestList({ onUnauthenticated }) {
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ count: 0, headcount: 0, travelling: 0 })
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState({ text: '', bad: false })

  const load = useCallback(async () => {
    try {
      const d = await api.rsvps()
      setRows(d.rsvps || [])
      setStats(d.stats)
      setLoaded(true)
      setNote({ text: `Updated ${timeNow()} IST`, bad: false })
    } catch (err) {
      if (err.status === 401) return onUnauthenticated()
      setNote({ text: `Could not refresh the list. ${err.message}`, bad: true })
    }
  }, [onUnauthenticated])

  useEffect(() => {
    load()
    const timer = setInterval(load, 30_000)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  async function remove(row) {
    if (!window.confirm(`Remove ${row.name} from the guest list? This cannot be undone.`)) return
    try {
      await api.remove(row.id)
      await load()
    } catch (err) {
      if (err.status === 401) return onUnauthenticated()
      setNote({ text: err.message, bad: true })
    }
  }

  const needle = query.trim().toLowerCase()
  const list = needle ? rows.filter((r) => `${r.name} ${r.phone}`.toLowerCase().includes(needle)) : rows

  return (
    <section className="slide dashSlide">
      <div className="slideHead">
        <div className="kicker">Only visible to you</div>
      </div>
      <h2>Guest list</h2>
      <p className="sub">Everyone who has responded to the invitation. The list refreshes on its own every 30 seconds.</p>

      <div className="stats" aria-live="polite">
        <div>
          <b>{stats.count}</b>
          <span>RSVPs</span>
        </div>
        <div>
          <b>{stats.headcount}</b>
          <span>Expected headcount</span>
        </div>
        <div>
          <b>{stats.travelling}</b>
          <span>Travelling in</span>
        </div>
      </div>

      <div className="guests card">
        <div className="tools">
          <div className="field">
            <label htmlFor="q">Search</label>
            <input type="search" id="q" placeholder="Name or phone" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="acts">
            <button className="btn out sm" type="button" onClick={load}>
              Refresh
            </button>
            <a className="btn out sm" href="/api/admin/rsvps.csv" download>
              Download CSV ↓
            </a>
          </div>
        </div>

        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Party</th>
                <th>Travelling</th>
                <th>Received</th>
                <th>
                  <span className="srOnly">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr className="empty">
                  <td colSpan={6}>
                    {rows.length ? 'No guests match that search.' : loaded ? "No RSVPs yet. They'll appear here as guests respond." : 'Loading…'}
                  </td>
                </tr>
              ) : (
                list.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Name">{r.name}</td>
                    <td data-label="Phone">
                      <a href={`tel:${String(r.phone).replace(/[^\d+]/g, '')}`}>{r.phone}</a>
                    </td>
                    <td data-label="Party">{r.guests}</td>
                    <td data-label="Travelling">
                      <span className={`pill${r.travelling === 'Yes' ? ' yes' : ''}`}>{r.travelling}</span>
                    </td>
                    <td data-label="Received">
                      <time dateTime={r.updated_at} title={r.created_at !== r.updated_at ? `First RSVP ${fmt(r.created_at)}` : undefined}>
                        {fmt(r.updated_at)}
                      </time>
                    </td>
                    <td className="act">
                      <button className="del" type="button" onClick={() => remove(r)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={`note${note.bad ? ' bad' : ''}`}>{note.text}</p>
      </div>
    </section>
  )
}
