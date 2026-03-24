import { useState, useRef, useCallback, useEffect } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { motion, AnimatePresence } from 'framer-motion'
import { geoNaturalEarth1 } from 'd3-geo'
import confetti from 'canvas-confetti'
import { getRandomCountry } from './data/countries'
import { getCountryExtras } from './data/countryExtras'
import './App.css'

function getFlagEmoji(code) {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

function getWeatherEmoji(code) {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  if (code >= 95) return '⛈️'
  return '🌡️'
}

function Starfield() {
  const stars = useRef(
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 3,
    }))
  ).current

  return (
    <div className="starfield">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

function WeatherCard({ lat, lng }) {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setWeather(null)
    setError(false)

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed')
        return res.json()
      })
      .then((data) => {
        setWeather(data.current_weather)
      })
      .catch(() => {
        setError(true)
      })
  }, [lat, lng])

  if (error) {
    return (
      <div className="info-card">
        <h3>Weather</h3>
        <p className="card-error">Could not load weather</p>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="info-card">
        <h3>Weather</h3>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="info-card">
      <h3>Weather</h3>
      <span className="weather-icon">{getWeatherEmoji(weather.weathercode)}</span>
      <p className="weather-temp">{Math.round(weather.temperature)}°C</p>
      <p className="weather-wind">💨 {weather.windspeed} km/h</p>
    </div>
  )
}

function ExtrasCards({ countryName }) {
  const extras = getCountryExtras(countryName)

  return (
    <>
      <div className="info-card">
        <h3>Fun Fact</h3>
        <p className="card-text">{extras.funFact}</p>
      </div>
      <div className="info-card">
        <h3>Day Off Message</h3>
        <p className="card-text">{extras.dayOffMessage}</p>
      </div>
    </>
  )
}

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const MAP_WIDTH = 900
const MAP_HEIGHT = 500
const MAP_SCALE = 160
const MAP_CENTER = [0, 0]
const ZOOM_LEVEL = 4

const projection = geoNaturalEarth1()
  .scale(MAP_SCALE)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
  .center(MAP_CENTER)

function fireConfetti(x, y) {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: {
      x: x / window.innerWidth,
      y: y / window.innerHeight,
    },
    colors: ['#e63946', '#f4845f', '#ffd166', '#06d6a0', '#118ab2'],
    gravity: 0.8,
    scalar: 0.9,
  })
}

function App() {
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [previousCountries, setPreviousCountries] = useState([])
  const [isFlying, setIsFlying] = useState(false)
  const [dartPosition, setDartPosition] = useState(null)
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1)', transformOrigin: '50% 50%' })
  const [throwCount, setThrowCount] = useState(0)
  const mapRef = useRef(null)

  const getPixelCoords = useCallback((lat, lng) => {
    const svgPoint = projection([lng, lat])
    if (!svgPoint || !mapRef.current) return null

    const svg = mapRef.current.querySelector('svg')
    if (!svg) return null

    const svgRect = svg.getBoundingClientRect()
    const scaleX = svgRect.width / MAP_WIDTH
    const scaleY = svgRect.height / MAP_HEIGHT

    return {
      x: svgRect.left + svgPoint[0] * scaleX,
      y: svgRect.top + svgPoint[1] * scaleY,
      svgX: svgPoint[0],
      svgY: svgPoint[1],
    }
  }, [])

  const handleClose = useCallback(() => {
    setSelectedCountry(null)
    setDartPosition(null)
    setZoomStyle({ transform: 'scale(1)', transformOrigin: '50% 50%', transition: 'transform 0.5s ease-out' })
  }, [])

  const handleThrowDart = useCallback(() => {
    // Save current country to history before throwing again
    if (selectedCountry) {
      setPreviousCountries((prev) => {
        if (prev.includes(selectedCountry.id)) return prev
        return [...prev, selectedCountry.id]
      })
    }

    // Close panel and reset zoom first
    setSelectedCountry(null)
    setZoomStyle({ transform: 'scale(1)', transformOrigin: '50% 50%', transition: 'transform 0.3s ease-out' })

    setTimeout(() => {
      const country = getRandomCountry()
      const target = getPixelCoords(country.lat, country.lng)
      if (!target) return

      setIsFlying(true)
      setDartPosition(target)
      setThrowCount((c) => c + 1)

      // After dart lands, zoom in + confetti + show panel
      setTimeout(() => {
        setIsFlying(false)
        setSelectedCountry(country)
        fireConfetti(target.x, target.y)
        const originX = (target.svgX / MAP_WIDTH) * 100
        const originY = (target.svgY / MAP_HEIGHT) * 100
        setZoomStyle({
          transform: `scale(${ZOOM_LEVEL})`,
          transformOrigin: `${originX}% ${originY}%`,
          transition: 'transform 1s ease-in-out',
        })
      }, 1200)
    }, selectedCountry ? 400 : 100)
  }, [getPixelCoords, selectedCountry])

  return (
    <div className="app">
      <Starfield />
      <div className="top-bar">
        <h1 className="title"><span>Dart</span><span className="accent">Away</span> 🎯</h1>
        {throwCount > 0 && (
          <span className="throw-count">{throwCount} throw{throwCount !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="map-container" ref={mapRef}>
        <ComposableMap
          projection="geoNaturalEarth1"
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          projectionConfig={{ scale: MAP_SCALE, center: MAP_CENTER }}
          style={{ width: '100%', ...zoomStyle }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isSelected = selectedCountry && geo.id === selectedCountry.id
                const isPrevious = previousCountries.includes(geo.id)
                let fillColor = '#1e2140'
                if (isSelected) fillColor = '#e63946'
                else if (isPrevious) fillColor = '#7a1a1f'

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: fillColor,
                        stroke: '#4a5080',
                        strokeWidth: 0.75,
                        outline: 'none',
                      },
                      hover: {
                        fill: isSelected ? '#e63946' : isPrevious ? '#8a2a2f' : '#2e3460',
                        stroke: '#4a5080',
                        strokeWidth: 0.75,
                        outline: 'none',
                      },
                      pressed: {
                        fill: isSelected ? '#e63946' : '#2e3460',
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      <AnimatePresence>
        {isFlying && dartPosition && (
          <motion.div
            className="dart"
            initial={{
              x: window.innerWidth / 2,
              y: window.innerHeight + 20,
            }}
            animate={{
              x: dartPosition.x,
              y: dartPosition.y,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2,
              ease: 'easeInOut',
            }}
            style={{ position: 'fixed', left: 0, top: 0 }}
          >
            🎯
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCountry && !isFlying && (
          <motion.div
            className="info-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <button className="close-btn" onClick={handleClose}>✕</button>
            <div className="info-header">
              <span className="flag">{getFlagEmoji(selectedCountry.code)}</span>
              <div>
                <h2 className="country-name">{selectedCountry.name}</h2>
                <p className="capital">📍 {selectedCountry.capital}</p>
              </div>
            </div>
            <div className="info-cards">
              <WeatherCard lat={selectedCountry.lat} lng={selectedCountry.lng} />
              <ExtrasCards countryName={selectedCountry.name} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="throw-btn"
        onClick={handleThrowDart}
        disabled={isFlying}
        whileHover={!isFlying ? { scale: 1.08 } : {}}
        whileTap={!isFlying ? { scale: 0.95 } : {}}
      >
        {isFlying ? 'Flying...' : 'Throw Dart'}
      </motion.button>
    </div>
  )
}

export default App
