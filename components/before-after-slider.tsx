"use client"

import { useState, useRef, useCallback } from "react"

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  beforeAlt?: string
  afterAlt?: string
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before treatment",
  afterAlt = "After treatment",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const clamp = (v: number) => Math.min(Math.max(v, 0), 100)

  const getPercent = useCallback((clientX: number) => {
    if (!containerRef.current) return 50
    const rect = containerRef.current.getBoundingClientRect()
    return clamp(((clientX - rect.left) / rect.width) * 100)
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setPosition(getPercent(e.clientX))
      const move = (ev: MouseEvent) => setPosition(getPercent(ev.clientX))
      const up = () => {
        window.removeEventListener("mousemove", move)
        window.removeEventListener("mouseup", up)
      }
      window.addEventListener("mousemove", move)
      window.addEventListener("mouseup", up)
    },
    [getPercent]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setPosition(getPercent(e.touches[0].clientX))
      const move = (ev: TouchEvent) => setPosition(getPercent(ev.touches[0].clientX))
      const end = () => {
        window.removeEventListener("touchmove", move)
        window.removeEventListener("touchend", end)
      }
      window.addEventListener("touchmove", move, { passive: true })
      window.addEventListener("touchend", end)
    },
    [getPercent]
  )

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3 / 4",
        overflow: "hidden",
        borderRadius: "18px",
        cursor: "col-resize",
        userSelect: "none",
        WebkitUserSelect: "none",
        border: "1px solid rgba(245,194,0,0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      {/* ── After image – base layer (always full) ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterSrc}
        alt={afterAlt}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top center",
        }}
      />

      {/* ── Before image – clipped to left `position`% ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeSrc}
        alt={beforeAlt}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top center",
          clipPath: `inset(0 ${100 - position}% 0 0)`,
          transition: "clip-path 0ms",
        }}
      />

      {/* ── Divider line ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${position}%`,
          transform: "translateX(-50%)",
          width: "2px",
          background: "rgba(255,255,255,0.85)",
          pointerEvents: "none",
          zIndex: 8,
        }}
      />

      {/* ── Circular handle ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${position}%`,
          transform: "translate(-50%, -50%)",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.92)",
          border: "2px solid rgba(255,255,255,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 16px rgba(0,0,0,0.45)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {/* Two outward-facing arrows */}
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
          <path
            d="M7 1L2 7L7 13"
            stroke="#222"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 1L18 7L13 13"
            stroke="#222"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ── Labels ── */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          background: "rgba(0,0,0,0.60)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          padding: "4px 11px",
          borderRadius: "999px",
          pointerEvents: "none",
          textTransform: "uppercase",
          zIndex: 9,
        }}
      >
        Before
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          background: "rgba(245,194,0,0.90)",
          color: "#080b12",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          padding: "4px 11px",
          borderRadius: "999px",
          pointerEvents: "none",
          textTransform: "uppercase",
          zIndex: 9,
        }}
      >
        After
      </div>
    </div>
  )
}
