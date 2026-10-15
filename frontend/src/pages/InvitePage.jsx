import RsvpForm from '../components/RsvpForm.jsx'
import Closing from '../components/Closing.jsx'
import { ADDRESS_LINES, CALENDAR_URL, MAPS_URL } from '../event.js'

export default function InvitePage() {
  return (
    <>
      {/* COVER (mirrors deck slide 1) */}
      <header className="cover">
        <div className="arc" aria-hidden="true" />
        <div className="in">
          <div className="logo">
            <img src="/logo.png" alt="Niveshaay" width="375" height="142" />
          </div>
          <div className="coverBody">
            <div className="kicker gold">Niveshaay Investment Management</div>
            <div className="dash" />
            <h1>You're invited</h1>
            <p className="tagline">to the opening of our new office</p>
            <p className="coverText">
              You've been part of our journey. Join us on Tuesday, 20 October for an evening of conversation as we open the
              doors to our new home in Vesu, Surat.
            </p>
            <a className="btn" href="#rsvp-form">
              RSVP for 20 October →
            </a>
          </div>
          <div className="coverFoot">
            <span>Tuesday, 20 October 2026 · 5:00 PM onwards →</span>
            <span>www.niveshaay.com</span>
          </div>
        </div>
      </header>

      <main className="in">
        {/* THE EVENING (mirrors deck slide 2) */}
        <section className="slide" id="evening">
          <div className="slideHead">
            <div className="kicker">The evening</div>
            <img src="/logo-wordmark.png" alt="" width="282" height="106" />
          </div>
          <div className="about">
            <div>
              <h2>A new home for Niveshaay</h2>
              <div className="quote">
                The Niveshaay team requests the pleasure of your company at the opening of our new office.
              </div>
              <p>
                We hunt for growth by <strong>thinking the entrepreneur way</strong>. As the team has grown, so has the need
                for a bigger room.
              </p>
              <p>Come and see the new office, meet the people behind our research and our funds, and spend the evening with us.</p>
            </div>
            <div className="tiles" role="list" aria-label="Event details">
              <div className="tile light" role="listitem">
                <div className="n">
                  20 <small>Oct</small>
                </div>
                <div className="l">Tuesday, 2026</div>
              </div>
              <div className="tile dark" role="listitem">
                <div className="n">
                  5:00 <small>PM</small>
                </div>
                <div className="l">Onwards, IST</div>
              </div>
              <div className="tile dark" role="listitem">
                <div className="n gold">
                  8<small>th</small>
                </div>
                <div className="l">Floor, Rajhans Skylar</div>
              </div>
              <div className="tile light" role="listitem">
                <div className="n">Vesu</div>
                <div className="l">Surat, Gujarat</div>
              </div>
            </div>
          </div>
        </section>

        {/* VENUE + RSVP (mirrors deck slide 4 cards) */}
        <section className="slide" id="rsvp">
          <div className="slideHead">
            <div className="kicker">Venue &amp; RSVP</div>
          </div>
          <h2>Will you join us?</h2>
          <p className="sub">Let us know you'll be there. Just your name, your number, and a heads-up if you're travelling in.</p>

          <div className="cards">
            <div className="card" id="venue">
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

            <div className="card" id="rsvp-form">
              <div className="role">RSVP · 20 October 2026</div>
              <h3>Reserve your place</h3>
              <RsvpForm />
            </div>
          </div>
        </section>

        <div className="pagefoot">
          <span>
            <b>20.10.2026</b> · Niveshaay Investment Management
          </span>
          <span>www.niveshaay.com</span>
        </div>
      </main>

      <Closing />
    </>
  )
}
