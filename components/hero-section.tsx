"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { FormData } from "./form-modal"

interface HeroSectionProps {
  onStartScan: (data: FormData) => void
}

const stats = [
  { value: "93%", label: "Result Rate" },
  { value: "95%", label: "Satisfaction" },
  { value: "35+", label: "Years" },
]

export function HeroSection({ onStartScan }: HeroSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const validate = () => {
    const newErrors: { name?: string; phone?: string } = {}
    if (!name.trim()) newErrors.name = "Name is required"
    if (!phone.trim()) newErrors.phone = "Phone number is required"
    else if (!/^\+?[\d\s-]{10,}$/.test(phone)) newErrors.phone = "Please enter a valid phone number"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return
    onStartScan({ name, phone, problem: "hair-fall" })
    setShowForm(false)
    setName("")
    setPhone("")
    setErrors({})
  }

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#080b12",
        padding: "60px 20px",
      }}
    >

      {/* ── BACKGROUND ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>

        {/* Gradient mesh — two soft amber orbs from opposing corners */}
        <div style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at -5% -10%, rgba(245,194,0,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 108% 108%, rgba(245,194,0,0.09) 0%, transparent 50%)
          `,
        }} />

        {/* Large grid — 72 px cells, very faint */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(245,194,0,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,194,0,0.045) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }} />

        {/* Center dark vignette — lifts the text off the grid */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 60% at 50% 48%, transparent 10%, rgba(8,11,18,0.65) 100%)",
        }} />

        {/* Top accent line — fades in from center */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, transparent 0%, #F5C200 25%, #F5C200 75%, transparent 100%)",
        }} />

        {/* Bottom fade into next section */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "140px",
          background: "linear-gradient(to top, #080b12 0%, transparent 100%)",
        }} />
      </div>

      {/* ── CONTENT ── */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: "750px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 0,
      }}>

        {/* Logo */}
        <img
          src="/Hair-Doc-logo.png"
          alt="HairDoc – Trichology Expert"
          style={{
            height: "clamp(64px, 10vw, 90px)",
            width: "auto",
            objectFit: "contain",
            marginBottom: "28px",
          }}
        />

        {/* Diamond ornament divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: "14px",
          width: "200px", marginBottom: "28px",
        }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, rgba(245,194,0,0.4))" }} />
          <div style={{ width: "7px", height: "7px", background: "#F5C200", transform: "rotate(45deg)", flexShrink: 0 }} />
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, rgba(245,194,0,0.4))" }} />
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(2.2rem, 5.8vw, 3.8rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          color: "#f2f0eb",
          marginBottom: "20px",
        }}>
          Uncover the true root cause
          <br />
          of your{" "}
          <span style={{
            background: "linear-gradient(95deg, #F5C200 20%, #FFE566 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            hair loss.
          </span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)",
          lineHeight: 1.85,
          color: "rgba(242,240,235,0.52)",
          maxWidth: "560px",
          marginBottom: "40px",
        }}>
          Trust a system refined over 35+ years of dedicated service to track your
          hair loss to its exact origin — achieving a{" "}
          <span style={{ color: "rgba(242,240,235,0.8)", fontWeight: 500 }}>93% verified result rate</span>{" "}
          and a{" "}
          <span style={{ color: "rgba(242,240,235,0.8)", fontWeight: 500 }}>95% client satisfaction score</span>{" "}
          across our specialized clinics.
        </p>

        {/* CTA */}
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: "#F5C200",
            color: "#080b12",
            border: "none",
            borderRadius: "10px",
            padding: "16px 52px",
            fontSize: "1.05rem",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "opacity 0.15s",
            marginBottom: "48px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.82" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
        >
          Take The Hair Test
        </button>

        {/* Stats panel */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          width: "100%",
          maxWidth: "400px",
          border: "1px solid rgba(245,194,0,0.18)",
          borderRadius: "14px",
          overflow: "hidden",
          background: "rgba(245,194,0,0.03)",
        }}>
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: "20px 8px",
                textAlign: "center",
                borderRight: i < 2 ? "1px solid rgba(245,194,0,0.18)" : "none",
              }}
            >
              <div style={{
                fontSize: "clamp(1.5rem, 4vw, 1.9rem)",
                fontWeight: 800,
                color: "#F5C200",
                lineHeight: 1,
                marginBottom: "6px",
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(242,240,235,0.38)",
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FORM DIALOG ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border-primary/20 bg-card/95 backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-foreground">
              Start Your Hair Analysis
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Enter your details to continue to camera scan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hero-name" className="text-foreground">Name</Label>
              <Input
                id="hero-name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border/50 bg-background/50 focus:border-primary focus:ring-primary"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hero-phone" className="text-foreground">Phone Number</Label>
              <Input
                id="hero-phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-border/50 bg-background/50 focus:border-primary focus:ring-primary"
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <Button
              type="submit"
              className="mt-2 w-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
