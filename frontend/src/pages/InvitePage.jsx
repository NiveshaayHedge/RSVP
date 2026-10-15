import Corners from '../components/Corners.jsx'
import GoldDust from '../components/GoldDust.jsx'
import RsvpForm from '../components/RsvpForm.jsx'
import { burst } from '../effects.js'
import { ADDRESS_LINES, CALENDAR_URL, MAPS_URL } from '../event.js'
import { smoothScrollTo } from '../scroll.js'

export default function InvitePage() {
  function goToForm(e) {
    e.preventDefault()
    burst(e.currentTarget)
    smoothScrollTo('reserve', {
      offset: 24,
      onDone: () => document.getElementById('name')?.focus({ preventScroll: true }),
    })
  }

  return (
    <>
      {/* COVER */}
      <header className="cover">
        <div className="arc" aria-hidden="true" />
        <GoldDust color="#F5DC98" density={9000} alphaMin={0.25} alphaMax={0.6} />
        <div className="frame" aria-hidden="true">
          <b className="c tl" />
          <b className="c tr" />
          <b className="c bl" />
          <b className="c br" />
        </div>
        <div className="in">
          <div className="logo">
            <img src="/logo.png" alt="Niveshaay" width="375" height="142" />
          </div>
          <div className="coverBody">
            <div className="eyebrow">An evening of celebration</div>
            <h1>You're invited</h1>
            <p className="tagline">to the new home of Niveshaay</p>
            <div className="orn" aria-hidden="true">
              <span />
              <i />
              <span />
            </div>
            <p className="coverSub">A new office. A new chapter.</p>
            <p className="coverText">
              Join us on the evening of Tuesday, 20th October to celebrate our new office at Rajhans Skylar, Surat.
            </p>
            <a className="btn" href="#reserve" onClick={goToForm}>
              RSVP · 20th October, 5 PM onwards
            </a>
          </div>
        </div>
      </header>

      {/* VENUE + RSVP */}
      <div className="lower">
        <GoldDust color="#C8952E" density={9000} alphaMin={0.15} alphaMax={0.55} />
        <main className="in lowerMain">
          <section className="slide" id="rsvp">
            <div className="slideHead">
              <div className="kicker">Venue &amp; RSVP</div>
            </div>
            <h2 className="lux">
              We await <em className="foil">your presence.</em>
            </h2>
            <div className="orn dark" aria-hidden="true">
              <span />
              <i />
              <span />
            </div>

            <div className="cards">
              <div className="card" id="venue">
                <Corners />
                <div className="role">Our new office</div>
                <h3>Rajhans Skylar</h3>
                <p className="addr">
                  {ADDRESS_LINES.map((line, i) => (
                    <span key={line}>
                      {line}
                      {i < ADDRESS_LINES.length - 1 && <br />}
                    </span>
                  ))}
                </p>
                <div className="actions">
                  <a className="btn out" href={MAPS_URL} target="_blank" rel="noopener">
                    Get directions ↗
                  </a>
                  <a className="btn out" href={CALENDAR_URL} target="_blank" rel="noopener">
                    Add to calendar ↗
                  </a>
                </div>
              </div>

              <div className="card" id="reserve">
                <Corners />
                <div className="role">RSVP · 20th October 2026</div>
                <h3>Reserve your place</h3>
                <RsvpForm />
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
