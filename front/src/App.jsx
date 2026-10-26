import { useEffect, useState } from 'react'

// Date locale au format AAAA-MM-JJ (toISOString décalerait la date à cause du fuseau horaire).
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const inDays = (n) => iso(new Date(Date.now() + n * 86400000))
const formatShort = (date) => new Date(date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

const formatDate = (date) =>
  new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

const formatDuration = (minutes) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`

const stopsLabel = (stops) => (stops === 0 ? 'Direct' : `${stops} escale`)

// Champ de recherche de ville avec suggestions (n'importe quelle ville du monde ayant un aéroport).
function CityPicker({ placeholder, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (query.length < 2) return setResults([])
    const timer = setTimeout(() => {
      fetch('/api/airports?q=' + encodeURIComponent(query))
        .then((response) => response.json())
        .then(setResults)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  function select(city) {
    onSelect(city)
    setQuery('')
    setResults([])
  }

  return (
    <div className="picker">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      {results.length > 0 && (
        <ul className="suggestions">
          {results.map((city) => (
            <li key={city.code} onMouseDown={() => select(city)}>
              <span className="code">{city.code}</span>
              <span>{city.city}</span>
              <span className="muted">{city.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Plane({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  )
}

// Calendrier fait maison (sans le calendrier du navigateur).
// mode "exact" : un clic = une date ; mode "range" : premier clic = début, second clic = fin.
function Calendar({ from, to, mode, onPick, min }) {
  const [view, setView] = useState(() => {
    const d = new Date((from || min || inDays(0)) + 'T00:00')
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [start, setStart] = useState(null)
  const today = inDays(0)
  const minDay = min ?? today
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const offset = (view.getDay() + 6) % 7 // lundi = première colonne
  const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: count }, (_, i) => iso(new Date(view.getFullYear(), view.getMonth(), i + 1)))

  function move(n) {
    setView(new Date(view.getFullYear(), view.getMonth() + n, 1))
  }

  function click(day) {
    if (mode === 'exact') {
      onPick(day, day, true)
    } else if (!start) {
      setStart(day)
      onPick(day, day, false)
    } else {
      setStart(null)
      onPick(day < start ? day : start, day < start ? start : day, true)
    }
  }

  function className(day) {
    if (day < minDay) return 'day past'
    if (day === from || day === to) return 'day selected'
    if (day > from && day < to) return 'day in-range'
    return day === today ? 'day today' : 'day'
  }

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" onClick={() => move(-1)} disabled={view <= thisMonth} aria-label="Mois précédent">
          ‹
        </button>
        <b>{view.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</b>
        <button type="button" onClick={() => move(1)} aria-label="Mois suivant">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="weekday">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={'empty' + i} />
        ))}
        {days.map((day) => (
          <button type="button" key={day} className={className(day)} disabled={day < minDay} onClick={() => click(day)}>
            {Number(day.slice(8))}
          </button>
        ))}
      </div>
      {mode === 'range' && (
        <small className="muted">{start ? 'Choisissez la date de fin.' : 'Choisissez la date de début puis la date de fin.'}</small>
      )}
    </div>
  )
}

// Choix du départ : date exacte, période libre, ou mois entier.
function DatePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(from === to ? 'exact' : 'range')

  const months = Array.from({ length: 6 }, (_, i) => {
    const start = new Date()
    start.setDate(1)
    start.setMonth(start.getMonth() + i)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return {
      label: start.toLocaleDateString('fr-FR', { month: 'long' }),
      year: start.getFullYear(),
      from: i === 0 ? inDays(1) : iso(start),
      to: iso(end),
    }
  })
  const presets = [
    { label: '2 semaines', from: inDays(1), to: inDays(14) },
    { label: '30 jours', from: inDays(1), to: inDays(30) },
    { label: '3 mois', from: inDays(1), to: inDays(90) },
  ]
  const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1
  const isActive = (range) => range.from === from && range.to === to

  function pick(newFrom, newTo, close = true) {
    onChange(newFrom, newTo)
    if (close) setOpen(false)
  }

  return (
    <div className="field when">
      <span className="field-label">Quand</span>
      <button type="button" className="when-value" onClick={() => setOpen(!open)}>
        {from === to ? (
          <>
            <span>{formatDate(from)}</span>
            <small className="muted">Date exacte ▾</small>
          </>
        ) : (
          <>
            <span>
              {formatShort(from)} <span className="muted">→</span> {formatShort(to)}
            </span>
            <small className="muted">Départ flexible sur {days} jours ▾</small>
          </>
        )}
      </button>

      {open && (
        <>
          <div className="backdrop" onClick={() => setOpen(false)} />
          <div className="popover date-popover">
            <div className="segmented three">
              {[
                ['exact', 'Date exacte'],
                ['range', 'Période'],
                ['month', 'Mois'],
              ].map(([value, label]) => (
                <button type="button" key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>
                  {label}
                </button>
              ))}
            </div>

            {tab !== 'month' && <Calendar key={tab} from={from} to={to} mode={tab} onPick={pick} />}

            {tab === 'month' && (
              <>
                <div className="months">
                  {months.map((m) => (
                    <button type="button" key={m.from} className={isActive(m) ? 'active' : ''} onClick={() => pick(m.from, m.to)}>
                      <b>{m.label}</b>
                      <small>{m.year}</small>
                    </button>
                  ))}
                </div>
                <span className="field-label">Ou dans les prochains</span>
                <div className="presets">
                  {presets.map((p) => (
                    <button type="button" key={p.label} className={isActive(p) ? 'active' : ''} onClick={() => pick(p.from, p.to)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Aller simple ou aller-retour, avec une durée de séjour flexible (min à max nuits).
function TripPicker({ trip, departure, onChange }) {
  const [open, setOpen] = useState(false)
  const { roundTrip, minNights, maxNights, returnDate } = trip
  const [tab, setTab] = useState(returnDate ? 'date' : 'nights')
  const presets = [
    { label: 'Week-end', min: 2, max: 3 },
    { label: 'Une semaine', min: 6, max: 8 },
    { label: 'Deux semaines', min: 13, max: 15 },
    { label: 'Peu importe', min: 2, max: 14 },
  ]
  const clamp = (n) => Math.min(30, Math.max(1, n))

  function setMin(n) {
    onChange({ ...trip, returnDate: null, minNights: clamp(n), maxNights: Math.max(clamp(n), maxNights) })
  }

  function setMax(n) {
    onChange({ ...trip, returnDate: null, maxNights: clamp(n), minNights: Math.min(clamp(n), minNights) })
  }

  return (
    <div className="field trip">
      <span className="field-label">Voyage</span>
      <div className="segmented">
        <button type="button" className={roundTrip ? '' : 'active'} onClick={() => onChange({ ...trip, roundTrip: false })}>
          Aller simple
        </button>
        <button type="button" className={roundTrip ? 'active' : ''} onClick={() => onChange({ ...trip, roundTrip: true })}>
          Aller-retour
        </button>
      </div>

      {roundTrip ? (
        <button type="button" className="stay-value" onClick={() => setOpen(!open)}>
          {returnDate
            ? `Retour le ${formatDate(returnDate)}`
            : `Séjour de ${minNights === maxNights ? minNights : `${minNights} à ${maxNights}`} nuits`}{' '}
          ▾
        </button>
      ) : (
        <span className="stay-value muted">Sans retour</span>
      )}

      {open && roundTrip && (
        <>
          <div className="backdrop" onClick={() => setOpen(false)} />
          <div className="popover">
            <div className="segmented">
              <button type="button" className={tab === 'nights' ? 'active' : ''} onClick={() => setTab('nights')}>
                Durée du séjour
              </button>
              <button type="button" className={tab === 'date' ? 'active' : ''} onClick={() => setTab('date')}>
                Date exacte
              </button>
            </div>

            {tab === 'date' && (
              <>
                <Calendar
                  from={returnDate ?? ''}
                  to={returnDate ?? ''}
                  min={iso(new Date(new Date(departure + 'T00:00').getTime() + 86400000))}
                  mode="exact"
                  onPick={(day) => {
                    onChange({ ...trip, returnDate: day })
                    setOpen(false)
                  }}
                />
                <small className="muted">Le retour se fera ce jour-là, quel que soit le jour de l'aller.</small>
              </>
            )}

            {tab === 'nights' && (
              <>
                <span className="field-label">Durée du séjour</span>
                <div className="stay-presets">
                  {presets.map((p) => (
                    <button
                      type="button"
                      key={p.label}
                      className={!returnDate && p.min === minNights && p.max === maxNights ? 'active' : ''}
                      onClick={() => onChange({ ...trip, returnDate: null, minNights: p.min, maxNights: p.max })}
                    >
                      <b>{p.label}</b>
                      <small>
                        {p.min} à {p.max} nuits
                      </small>
                    </button>
                  ))}
                </div>

                <span className="field-label">Sur mesure</span>
                {[
                  ['Au moins', minNights, setMin],
                  ['Au plus', maxNights, setMax],
                ].map(([label, value, set]) => (
                  <div className="stepper" key={label}>
                    <span>{label}</span>
                    <button type="button" onClick={() => set(value - 1)} aria-label={label + ' : une nuit de moins'}>
                      −
                    </button>
                    <b>{value} nuits</b>
                    <button type="button" onClick={() => set(value + 1)} aria-label={label + ' : une nuit de plus'}>
                      +
                    </button>
                  </div>
                ))}
                <small className="muted">On cherche pour vous le retour le moins cher dans cette plage.</small>
              </>
            )}

            <button type="button" className="done" onClick={() => setOpen(false)}>
              Valider
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Le meilleur vol, présenté comme une carte d'embarquement.
function Ticket({ flight: f, demo }) {
  return (
    <a className="ticket" href={f.link} target="_blank" rel="noreferrer">
      <div className="ticket-main">
        <div className="ticket-head">
          <Plane className="head-plane" />
          Boarding pass
          <span className="ticket-tag">Meilleur prix trouvé</span>
        </div>
        <div className="ticket-body">
          <div className="barcode-v" />
          <div className="ticket-content">
            <div className="ticket-route">
              <div className="stop">
                <span className="field-label">De</span>
                <b>{f.origin}</b>
                <span className="stop-city">{f.originCity}</span>
                <small>
                  {formatDate(f.date)} · {f.departure}
                </small>
              </div>
              <div className="path">
                <i />
                <Plane />
                <i />
              </div>
              <div className="stop">
                <span className="field-label">À</span>
                <b>{f.destination}</b>
                <span className="stop-city">{f.city}</span>
                <small>
                  {formatDate(f.date)} · {f.arrival}
                </small>
              </div>
            </div>
            <dl className="ticket-details">
              {f.return && (
                <div>
                  <dt>Retour</dt>
                  <dd>
                    {formatDate(f.return.date)} · {f.return.departure}
                  </dd>
                </div>
              )}
              {f.return && (
                <div>
                  <dt>Séjour</dt>
                  <dd>{f.return.nights} nuits</dd>
                </div>
              )}
              <div>
                <dt>Compagnie</dt>
                <dd>{f.airline}</dd>
              </div>
              <div>
                <dt>Vol</dt>
                <dd>{stopsLabel(f.stops)}</dd>
              </div>
              <div>
                <dt>Durée</dt>
                <dd>{formatDuration(f.duration)}</dd>
              </div>
              {f.seller && (
                <div>
                  <dt>Vendu par</dt>
                  <dd>{f.seller}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      <div className="ticket-stub">
        <div className="ticket-head">Boarding pass</div>
        <div className="stub-body">
          <div className="stub-route">
            <b>{f.origin}</b>
            <Plane />
            <b>{f.destination}</b>
          </div>
          <span className="field-label">{f.return ? 'Aller-retour' : 'Aller simple'}</span>
          <strong className="stub-price">{f.price} €</strong>
          <span className="stub-cta">{demo ? 'Voir les vols du jour ↗' : 'Réserver ce vol ↗'}</span>
          <div className="barcode-h" />
        </div>
      </div>
    </a>
  )
}

export default function App() {
  const [origin, setOrigin] = useState({ code: 'PAR', city: 'Paris' })
  const [destinations, setDestinations] = useState([
    { code: 'BCN', city: 'Barcelone' },
    { code: 'LIS', city: 'Lisbonne' },
    { code: 'ROM', city: 'Rome' },
  ])
  const [from, setFrom] = useState(inDays(1))
  const [to, setTo] = useState(inDays(30))
  const [trip, setTrip] = useState({ roundTrip: true, minNights: 3, maxNights: 7, returnDate: null })
  const [result, setResult] = useState(null)
  const [filter, setFilter] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Première recherche automatique avec les valeurs par défaut.
  useEffect(() => {
    search()
  }, [])

  function addDestination(city) {
    if (city.code !== origin.code && !destinations.some((d) => d.code === city.code)) {
      setDestinations([...destinations, city])
    }
  }

  function changeOrigin(city) {
    setOrigin(city)
    removeDestination(city.code)
  }

  function removeDestination(code) {
    setDestinations(destinations.filter((d) => d.code !== code))
  }

  async function search(e) {
    e?.preventDefault()
    setLoading(true)
    setFilter(null)
    const params = new URLSearchParams({
      origin: origin.code,
      destinations: destinations.map((d) => d.code).join(','),
      from,
      to,
    })
    if (trip.roundTrip && trip.returnDate) {
      params.set('returnDate', trip.returnDate)
    } else if (trip.roundTrip) {
      params.set('minNights', trip.minNights)
      params.set('maxNights', trip.maxNights)
    }
    const response = await fetch('/api/flights?' + params)
    const data = await response.json()
    setError(data.error ?? '')
    setResult(data.error ? null : data)
    setLoading(false)
  }

  const flights = result ? result.flights.filter((f) => !filter || f.destination === filter) : []
  const best = result?.flights[0]

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">
          vols<b>pas</b>chers
        </span>
        <span className="mono muted">Comparateur de vols</span>
      </header>

      <section className="intro">
        <h1>
          Le vol le moins cher,
          <br />
          <em>où que vous alliez.</em>
        </h1>
        <p>Une ville de départ, une période, autant de destinations que vous voulez.</p>
      </section>

      <form className="search" onSubmit={search}>
        <div className="row">
          <div className="field">
            <span className="field-label">De</span>
            <div className="value">
              <span className="code">{origin.code}</span> {origin.city}
            </div>
            <CityPicker placeholder="Changer…" onSelect={changeOrigin} />
          </div>

          <DatePicker
            from={from}
            to={to}
            onChange={(newFrom, newTo) => {
              setFrom(newFrom)
              setTo(newTo)
            }}
          />

          <TripPicker trip={trip} departure={from} onChange={setTrip} />
        </div>

        <div className="field destinations-field">
          <span className="field-label">Vers</span>
          <div className="chips">
            {destinations.map((d) => (
              <span key={d.code} className="chip">
                <span className="code">{d.code}</span> {d.city}
                <button type="button" onClick={() => removeDestination(d.code)} aria-label={'Retirer ' + d.city}>
                  ×
                </button>
              </span>
            ))}
            <CityPicker placeholder="Ajouter une ville, un pays, un code…" onSelect={addDestination} />
          </div>
        </div>

        <button className="submit" disabled={loading || destinations.length === 0}>
          {loading ? 'Recherche…' : 'Rechercher les vols'} <span>→</span>
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result?.missing.length > 0 && (
        <div className="missing">
          <p>
            <b>Pas de prix connu pour {result.missing.map((m) => m.city).join(', ')}.</b> Nos prix viennent des recherches
            récentes faites sur Aviasales : les trajets peu demandés n'en ont parfois aucun, même si des vols existent.
          </p>
          <div className="missing-links">
            {result.missing.map((m) => (
              <a key={m.destination} href={m.link} target="_blank" rel="noreferrer">
                Chercher {m.city} en direct ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {result && !best && result.missing.length === 0 && <p className="empty">Aucun vol trouvé sur cette période.</p>}

      {best && (
        <>
          <Ticket flight={best} demo={result.provider === 'mock'} />

          <section>
            <h3 className="section-title">Par destination</h3>
            <div className="board">
              {result.cheapestByDestination.map((f) => (
                <button
                  key={f.destination}
                  className={filter === f.destination ? 'board-row active' : 'board-row'}
                  onClick={() => setFilter(filter === f.destination ? null : f.destination)}
                >
                  <span className="code">{f.destination}</span>
                  <span className="city">{f.city}</span>
                  <span className="muted">dès</span>
                  <span className="mono">{f.price} €</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="section-title">
              {flights.length} vols{filter && ` vers ${flights[0]?.city}`}
              <span className="muted"> · du moins cher au plus cher</span>
              {filter && (
                <button className="clear" onClick={() => setFilter(null)}>
                  Tout afficher
                </button>
              )}
            </h3>

            <ul className="flights">
              {flights.map((f, i) => (
                <li key={i}>
                  <a className="flight" href={f.link} target="_blank" rel="noreferrer">
                    <div className="legs">
                      {[f, f.return].filter(Boolean).map((leg, j) => (
                        <div className="leg" key={j}>
                          <span className="leg-date">{formatDate(leg.date)}</span>
                          <span className="leg-times">
                            {leg.departure} <span className="muted">→</span> {leg.arrival}
                          </span>
                          <span className="leg-route">
                            {j === 0 ? `${f.origin} – ${f.destination}` : `${f.destination} – ${f.origin}`}
                          </span>
                          <span className="muted">
                            {formatDuration(leg.duration)} · {stopsLabel(leg.stops)} · {leg.airline}
                            {leg.nights && ` · après ${leg.nights} nuits`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flight-price">
                      <strong>{f.price} €</strong>
                      <span className="book">{result.provider === 'mock' ? 'Voir ↗' : 'Réserver ↗'}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <footer className="muted">
            {result.provider === 'mock'
              ? 'Mode démo : vols et prix fictifs. Le lien ouvre les vrais vols de ce trajet à ces dates sur Google Flights.'
              : 'Prix fournis par Aviasales : chaque vol ouvre directement son billet pour le réserver.'}
          </footer>
        </>
      )}
    </div>
  )
}
