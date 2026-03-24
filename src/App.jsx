import { useState, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { motion, AnimatePresence } from 'framer-motion'
import { geoNaturalEarth1 } from 'd3-geo'
import { getRandomCountry } from './data/countries'
import './App.css'

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

function App() {
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [isFlying, setIsFlying] = useState(false)
  const [dartPosition, setDartPosition] = useState(null)
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1)', transformOrigin: '50% 50%' })
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

  const handleThrowDart = useCallback(() => {
    // Reset zoom first
    setZoomStyle({ transform: 'scale(1)', transformOrigin: '50% 50%', transition: 'transform 0.3s ease-out' })

    setTimeout(() => {
      const country = getRandomCountry()
      const target = getPixelCoords(country.lat, country.lng)
      if (!target) return

      setIsFlying(true)
      setDartPosition(target)
      setSelectedCountry(country)

      // After dart lands, zoom in
      setTimeout(() => {
        setIsFlying(false)
        const originX = (target.svgX / MAP_WIDTH) * 100
        const originY = (target.svgY / MAP_HEIGHT) * 100
        setZoomStyle({
          transform: `scale(${ZOOM_LEVEL})`,
          transformOrigin: `${originX}% ${originY}%`,
          transition: 'transform 1s ease-in-out',
        })
      }, 1200)
    }, 300)
  }, [getPixelCoords])

  return (
    <div className="app">
      <h1 className="title"><span>Dart</span><span className="accent">Away</span> 🎯</h1>
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
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: isSelected ? '#e63946' : '#1e2140',
                        stroke: '#4a5080',
                        strokeWidth: 0.75,
                        outline: 'none',
                      },
                      hover: {
                        fill: isSelected ? '#e63946' : '#2e3460',
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

      <button
        className="throw-btn"
        onClick={handleThrowDart}
        disabled={isFlying}
      >
        {isFlying ? 'Flying...' : 'Throw Dart'}
      </button>
    </div>
  )
}

export default App
