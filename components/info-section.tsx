"use client"

import { useState } from "react"
import { BeforeAfterSlider } from "@/components/before-after-slider"

interface InfoSectionProps {
  onStartScan: () => void
}

const patientCases = [
  {
    before: "/bef1.webp",
    after: "/aft1.webp",
    name: "Patient 1",
  },
  {
    before: "/bef2.webp",
    after: "/aft2.webp",
    name: "Patient 2",
  },
  {
    before: "/bef3.webp",
    after: "/aft3.webp",
    name: "Patient 3",
  },
]

const treatments = [
  {
    title: "Root Grow Treatment",
    desc: "Supports weak roots, improves scalp nourishment, and helps activate healthier hair growth from the follicle level.",
    suited: "Hair thinning, weak roots, low density.",
  },
  {
    title: "Internal Treatment",
    desc: "Helps address internal factors like stress, lifestyle imbalance, and nutritional triggers that may affect the hair growth cycle.",
    suited: "Recurring hair fall, stress-linked hair loss, weak growth.",
  },
  {
    title: "Beach Flower Extract Support",
    desc: "Used as holistic support to help manage stress-related, sleep-related, and psychosomatic factors linked with hair and scalp concerns.",
    suited: "Stress, insomnia, headache, scalp discomfort.",
  },
  {
    title: "Hairdoc Care Kit",
    desc: "A guided home-care routine that supports your in-clinic treatment and helps maintain scalp hygiene between sessions.",
    suited: "Daily care, scalp maintenance, treatment support.",
  },
]

const journeySteps = [
  {
    step: "STEP 1",
    tag: "Takes 2–4 mins",
    title: "Take The Hair Test",
    desc: "A quick assessment to understand your hair loss pattern, scalp condition, lifestyle triggers, and concern history.",
  },
  {
    step: "STEP 2",
    tag: "Expert Review",
    title: "Get Root-Cause Analysis",
    desc: "HairDoc experts review your responses and evaluate the possible origin of your hair fall before suggesting the next step.",
  },
  {
    step: "STEP 3",
    tag: "Journey Begins",
    title: "Start Personalized Treatment",
    desc: "Based on your analysis, you receive a treatment plan combining homeopathy, hair science, scalp care, and internal support.",
  },
]

/* ── Reusable CTA button ── */
function CtaButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "#F5C200",
        color: "#080b12",
        border: "none",
        borderRadius: "10px",
        padding: "14px 36px",
        fontSize: "1rem",
        fontWeight: 700,
        cursor: "pointer",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.82" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
    >
      Take The Hair Test
    </button>
  )
}

export function InfoSection({ onStartScan }: InfoSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const prev = () => setActiveIndex((i) => Math.max(0, i - 1))
  const next = () => setActiveIndex((i) => Math.min(patientCases.length - 1, i + 1))

  return (
    <div style={{ background: "#080b12", color: "#f2f0eb" }}>
      <style>{`
        .info-section { padding: 60px 16px; }
        .treatments-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .journey-grid   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

        /* ── Desktop: 3-col grid, hide carousel ── */
        .patients-grid         { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .patients-carousel-wrap { display: none; }

        /* ── Mobile ≤ 900 px: hide grid, show carousel ── */
        @media (max-width: 900px) {
          .patients-grid          { display: none; }
          .patients-carousel-wrap { display: block; position: relative; }

          .patients-carousel-viewport {
            overflow: hidden;
            border-radius: 18px;
          }
          .patients-carousel-track {
            display: flex;
            transition: transform 0.42s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .patients-carousel-track > * {
            flex: 0 0 100%;
            min-width: 0;
          }

          /* Dot indicators */
          .carousel-dots {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 20px;
          }
          .carousel-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: rgba(245,194,0,0.25);
            border: none;
            cursor: pointer;
            padding: 0;
            transition: background 0.25s, transform 0.25s;
          }
          .carousel-dot.active {
            background: #F5C200;
            transform: scale(1.35);
          }

          /* Prev / Next arrow buttons */
          .carousel-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 38px; height: 38px;
            border-radius: 50%;
            border: 1.5px solid rgba(245,194,0,0.5);
            background: rgba(8,11,18,0.75);
            backdrop-filter: blur(6px);
            color: #F5C200;
            font-size: 20px;
            line-height: 1;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            z-index: 20;
            transition: background 0.2s, border-color 0.2s;
          }
          .carousel-arrow:disabled {
            opacity: 0.28;
            cursor: default;
          }
          .carousel-arrow.left  { left: -14px; }
          .carousel-arrow.right { right: -14px; }
        }

        @media (max-width: 768px) {
          .info-section { padding: 40px 16px; }
          .treatments-grid { grid-template-columns: 1fr; }
          .journey-grid   { grid-template-columns: 1fr; }
          .carousel-arrow.left  { left: 4px; }
          .carousel-arrow.right { right: 4px; }
        }
      `}</style>

      {/* TOP DIVIDER */}
      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(245,194,0,0.4), transparent)" }} />

      {/* ─────────────────────────────────────────
          SECTION 2 – REAL PATIENTS, REAL STORIES
      ───────────────────────────────────────── */}
      <section className="info-section" style={{ textAlign: "center" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* Heading */}
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              marginBottom: "12px",
            }}
          >
            Real Patients{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #F5C200, #FFE566)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Real Stories
            </span>
          </h2>
          <p
            style={{
              fontSize: "1rem",
              color: "#8a8a8a",
              lineHeight: 1.75,
              maxWidth: "580px",
              margin: "0 auto 40px",
            }}
          >
            Drag the handle to reveal each patient&apos;s transformation.
          </p>

          {/* ── Desktop: 3-col grid ── */}
          <div className="patients-grid">
            {patientCases.map((c) => (
              <BeforeAfterSlider
                key={c.name}
                beforeSrc={c.before}
                afterSrc={c.after}
                beforeAlt={`${c.name} before treatment`}
                afterAlt={`${c.name} after treatment`}
              />
            ))}
          </div>

          {/* ── Mobile: one-at-a-time carousel ── */}
          <div className="patients-carousel-wrap">
            {/* Prev arrow */}
            <button
              className="carousel-arrow left"
              onClick={prev}
              disabled={activeIndex === 0}
              aria-label="Previous patient"
            >
              ‹
            </button>

            {/* Sliding viewport */}
            <div className="patients-carousel-viewport">
              <div
                className="patients-carousel-track"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {patientCases.map((c) => (
                  <div key={c.name}>
                    <BeforeAfterSlider
                      beforeSrc={c.before}
                      afterSrc={c.after}
                      beforeAlt={`${c.name} before treatment`}
                      afterAlt={`${c.name} after treatment`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Next arrow */}
            <button
              className="carousel-arrow right"
              onClick={next}
              disabled={activeIndex === patientCases.length - 1}
              aria-label="Next patient"
            >
              ›
            </button>

            {/* Dot indicators */}
            <div className="carousel-dots">
              {patientCases.map((_, i) => (
                <button
                  key={i}
                  className={`carousel-dot${i === activeIndex ? " active" : ""}`}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to patient ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(245,194,0,0.2), transparent)" }} />

      {/* ─────────────────────────────────────────
          SECTION 3 – TREATMENTS
      ───────────────────────────────────────── */}
      <section className="info-section" style={{ position: "relative" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.6rem)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: "16px",
              }}
            >
              Personalized Treatments After{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #F5C200, #FFE566)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Root-Cause Analysis
              </span>
            </h2>
            <p style={{ fontSize: "1rem", lineHeight: 1.8, color: "#8a8a8a", maxWidth: "680px", margin: "0 auto" }}>
              After your hair test, HairDoc recommends a treatment plan based on your scalp condition,
              hair loss stage, root strength, and internal triggers.
            </p>
          </div>

          {/* Treatment cards */}
          <div className="treatments-grid">
            {treatments.map((item) => (
              <div
                key={item.title}
                style={{
                  background: "linear-gradient(145deg, #0e1118, #0a0d15)",
                  border: "1px solid rgba(245,194,0,0.22)",
                  borderRadius: "20px",
                  padding: "36px 32px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                    background: "linear-gradient(90deg, transparent, #F5C200, transparent)",
                  }}
                />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "12px", color: "#F5C200" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "0.93rem", lineHeight: 1.75, color: "#8a8a8a", marginBottom: "16px" }}>
                  {item.desc}
                </p>
                <p style={{ fontSize: "0.82rem", color: "rgba(245,194,0,0.75)", fontWeight: 600 }}>
                  Best suited for: {item.suited}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <CtaButton onClick={onStartScan} />
          </div>
        </div>
      </section>

      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(245,194,0,0.2), transparent)" }} />

      {/* ─────────────────────────────────────────
          SECTION 4 – HOLISTIC PLAN
      ───────────────────────────────────────── */}
      <section
        className="info-section"
        style={{ textAlign: "center" }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em",
              textTransform: "uppercase", color: "#F5C200", marginBottom: "16px",
            }}
          >
            HAIRDOC&apos;S HOLISTIC PLAN FOR HAIR ISSUES
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
            }}
          >
            The Root-Cause Way
          </h2>
          <p
            style={{
              fontSize: "1rem", fontWeight: 700, color: "#F5C200",
              marginBottom: "24px", letterSpacing: "0.08em",
            }}
          >
            HOMEOPATHY + HAIR SCIENCE + SCALP ANALYSIS
          </p>
          <p
            style={{
              fontSize: "1rem", lineHeight: 1.8, color: "#8a8a8a",
              maxWidth: "680px", margin: "0 auto 36px",
            }}
          >
            HairDoc combines advanced hair science, homeopathic care, and detailed scalp analysis to create
            personalized treatment plans that focus on the true root cause of hair loss — not just the
            visible symptoms.
          </p>
          <CtaButton onClick={onStartScan} />
        </div>
      </section>

      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(245,194,0,0.2), transparent)" }} />

      {/* ─────────────────────────────────────────
          SECTION 6 – THE HAIRDOC JOURNEY
      ───────────────────────────────────────── */}
      <section className="info-section" style={{ position: "relative" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.6rem)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              The HairDoc Journey
            </h2>
          </div>

          {/* Step cards */}
          <div className="journey-grid">
            {journeySteps.map((item, i) => (
              <div
                key={item.step}
                style={{
                  background: "linear-gradient(145deg, #0e1118, #0a0d15)",
                  border: "1px solid rgba(245,194,0,0.22)",
                  borderRadius: "20px",
                  padding: "36px 32px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                    background: "linear-gradient(90deg, transparent, #F5C200, transparent)",
                  }}
                />
                {/* Watermark number */}
                <div
                  style={{
                    position: "absolute", top: 16, right: 20,
                    fontSize: "56px", fontWeight: 900,
                    color: "rgba(245,194,0,0.07)", lineHeight: 1, userSelect: "none",
                  }}
                >
                  {i + 1}
                </div>

                {/* Step badge */}
                <div style={{ marginBottom: "16px" }}>
                  <span
                    style={{
                      fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em",
                      textTransform: "uppercase", color: "#F5C200",
                      background: "rgba(245,194,0,0.08)",
                      border: "1px solid rgba(245,194,0,0.25)",
                      borderRadius: "999px", padding: "3px 12px",
                    }}
                  >
                    {item.step}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "12px", color: "#f2f0eb" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "0.93rem", lineHeight: 1.75, color: "#8a8a8a", marginBottom: "16px" }}>
                  {item.desc}
                </p>
                <p style={{ fontSize: "0.82rem", color: "rgba(245,194,0,0.75)", fontWeight: 600 }}>
                  {item.tag}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM DIVIDER */}
      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(245,194,0,0.4), transparent)" }} />
    </div>
  )
}
