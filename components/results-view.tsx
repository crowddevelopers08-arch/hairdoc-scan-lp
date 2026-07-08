"use client"

import { useState } from "react"
import { ArrowLeft, Download, CheckCircle2, Loader2 } from "lucide-react"
import type { FormData } from "./form-modal"

interface ResultsViewProps {
  formData: FormData
  capturedImage: string | null
  onBack: () => void
}

const CONSULTATION_PDF = "/Online-Hair-and-Scalp-Consultation.pdf"
const ONLINE_CONSULTATION_FORM_NAME = "scan lp online consultation"

async function downloadFromPublic(pdfPath: string, fileName: string) {
  const response = await fetch(pdfPath)
  if (!response.ok) {
    throw new Error(`PDF not found at ${pdfPath}`)
  }

  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
}

export function ResultsView({ formData, capturedImage, onBack }: ResultsViewProps) {
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [showConsultationForm, setShowConsultationForm] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [consultationSaving, setConsultationSaving] = useState(false)
  const [consultationSubmitted, setConsultationSubmitted] = useState(false)
  const [consultationSubmitError, setConsultationSubmitError] = useState("")
  const [consultationForm, setConsultationForm] = useState({
    name: formData.name || "",
    phone: formData.phone || "",
    date: "",
    time: "",
  })
  const [consultationErrors, setConsultationErrors] = useState<Record<string, string>>({})

  const handleDownload = async () => {
    setPdfGenerating(true)
    try {
      await downloadFromPublic(CONSULTATION_PDF, "Online-Hair-and-Scalp-Consultation.pdf")
    } catch (err) {
      console.error("Download failed:", err)
    } finally {
      setPdfGenerating(false)
    }
  }

  void formData
  void capturedImage

  const formatSlotPart = (hours24: number, minutes: number) => {
    const normalizedHours = hours24 % 12 || 12
    const suffix = hours24 >= 12 ? "PM" : "AM"
    if (minutes === 0) return `${normalizedHours} ${suffix}`
    return `${normalizedHours}.${minutes.toString().padStart(2, "0")} ${suffix}`
  }

  const consultationTimeSlots = Array.from({ length: 18 }, (_, index) => {
    const startMinutes = 10 * 60 + index * 30
    const endMinutes = startMinutes + 30
    const startHours = Math.floor(startMinutes / 60)
    const startRemainder = startMinutes % 60
    const endHours = Math.floor(endMinutes / 60)
    const endRemainder = endMinutes % 60
    return `${formatSlotPart(startHours, startRemainder)} to ${formatSlotPart(endHours, endRemainder)}`
  })

  const today = new Date().toISOString().split("T")[0]

  const openConsultationForm = () => {
    setConsultationSubmitted(false)
    setConsultationSubmitError("")
    setConsultationForm((current) => ({
      ...current,
      name: current.name || formData.name || "",
      phone: current.phone || formData.phone || "",
    }))
    setShowConsultationForm(true)
  }

  const closeConsultationForm = () => {
    setShowConsultationForm(false)
    setShowTimePicker(false)
    setConsultationErrors({})
  }

  const handleConsultationFieldChange = (field: keyof typeof consultationForm, value: string) => {
    setConsultationForm((current) => ({ ...current, [field]: value }))
    setConsultationErrors((current) => ({ ...current, [field]: "" }))
    setConsultationSubmitError("")
  }

  const handleConsultationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (!consultationForm.name.trim()) nextErrors.name = "Name is required"
    if (!consultationForm.phone.trim()) nextErrors.phone = "Phone number is required"
    else if (!/^\+?[\d\s-]{10,}$/.test(consultationForm.phone)) nextErrors.phone = "Enter a valid phone number"
    if (!consultationForm.date) nextErrors.date = "Date is required"
    if (!consultationForm.time) nextErrors.time = "Timing is required"

    if (Object.keys(nextErrors).length > 0) {
      setConsultationErrors(nextErrors)
      return
    }

    setConsultationSaving(true)
    setConsultationSubmitError("")
    setConsultationErrors({})

    try {
      const response = await fetch("/api/save-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: consultationForm.name.trim(),
          phone: consultationForm.phone.trim(),
          problem: formData.problem || "hair-fall",
          imageData: capturedImage ?? "consultation-booking",
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          formName: ONLINE_CONSULTATION_FORM_NAME,
          consultationDate: consultationForm.date,
          consultationTime: consultationForm.time,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Failed to save consultation" }))
        throw new Error(payload?.error || "Failed to save consultation")
      }

      setConsultationSubmitted(true)
      window.location.assign("/thank-you")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save consultation"
      setConsultationSubmitError(message)
    } finally {
      setConsultationSaving(false)
    }
  }

  return (
    <div className="results-shell" style={{ minHeight: "100vh", background: "#080b12", color: "#f2f0eb", padding: "0" }}>
      <style>{`
        .pdf-card-inner { display: flex; align-items: center; justify-content: flex-end; gap: 18px; flex-wrap: wrap; }
        .pdf-desktop-card { display: block; }
        .pdf-dl-btn { display: flex; flex-shrink: 0; }
        .mobile-dl-btn { display: none; }
        .assessment-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .assessment-card {
          min-height: 68px;
          border-radius: 14px;
          border: 1px solid rgba(245,194,0,0.18);
          background: linear-gradient(145deg, rgba(245,194,0,0.08), rgba(255,255,255,0.02));
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #f2f0eb;
          line-height: 1.35;
          box-shadow: inset 0 1px 0 rgba(245,194,0,0.08);
        }
        .consultation-button {
          animation: consultationButtonPulse 5s ease-in-out infinite;
        }
        .consultation-button-wrap {
          display: flex;
          justify-content: center;
        }
        .consultation-form-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(8,11,18,0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 40;
          padding: 16px;
        }
        .consultation-form-card {
          width: min(100%, 460px);
          border-radius: 24px;
          border: 1px solid rgba(245,194,0,0.25);
          background: linear-gradient(160deg, rgba(15,18,25,0.98), rgba(9,12,19,0.98));
          box-shadow: 0 20px 70px rgba(0,0,0,0.45), 0 0 30px rgba(245,194,0,0.1);
          padding: 24px;
        }
        .consultation-form-grid {
          display: grid;
          gap: 14px;
        }
        .consultation-form-field {
          display: grid;
          gap: 8px;
          text-align: left;
        }
        .consultation-form-label {
          color: #f2f0eb;
          font-size: 0.92rem;
          font-weight: 600;
        }
        .consultation-form-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(245,194,0,0.18);
          background: rgba(255,255,255,0.03);
          color: #f2f0eb;
          padding: 12px 14px;
          font-size: 0.95rem;
          outline: none;
        }
        .consultation-form-input:focus {
          border-color: rgba(245,194,0,0.5);
          box-shadow: 0 0 0 3px rgba(245,194,0,0.1);
        }
        .consultation-form-input option {
          background: #0e1118;
          color: #f2f0eb;
        }
        .consultation-form-schedule {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .consultation-time-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          max-height: min(60vh, 520px);
          overflow-y: auto;
          padding-right: 4px;
        }
        .consultation-time-slot {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(245,194,0,0.18);
          background: rgba(255,255,255,0.03);
          color: #f2f0eb;
          padding: 12px 10px;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .consultation-time-slot:hover {
          border-color: rgba(245,194,0,0.45);
          background: rgba(245,194,0,0.08);
        }
        .consultation-time-slot.active {
          border-color: rgba(245,194,0,0.7);
          background: rgba(245,194,0,0.16);
          color: #fff8d6;
          box-shadow: 0 0 0 2px rgba(245,194,0,0.12);
        }
        .consultation-time-trigger {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(245,194,0,0.18);
          background: rgba(255,255,255,0.03);
          color: #f2f0eb;
          padding: 12px 14px;
          font-size: 0.95rem;
          text-align: left;
          cursor: pointer;
        }
        .consultation-time-trigger.empty {
          color: #8a8a8a;
        }
        .consultation-form-error {
          color: #ff9e9e;
          font-size: 0.8rem;
        }
        .consultation-form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .consultation-form-primary,
        .consultation-form-secondary {
          flex: 1;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
        }
        .consultation-form-primary {
          border: none;
          background: #F5C200;
          color: #080b12;
          box-shadow: 0 0 24px rgba(245,194,0,0.24);
        }
        .consultation-form-secondary {
          border: 1px solid rgba(245,194,0,0.2);
          background: transparent;
          color: #f2f0eb;
        }
        .consultation-form-success {
          border-radius: 16px;
          border: 1px solid rgba(245,194,0,0.2);
          background: rgba(245,194,0,0.08);
          color: #f2f0eb;
          padding: 16px;
          margin-top: 16px;
          text-align: left;
        }
        .consultation-time-modal {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(8,11,18,0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 50;
          padding: 16px;
        }
        .consultation-time-modal-card {
          width: min(100%, 560px);
          border-radius: 24px;
          border: 1px solid rgba(245,194,0,0.25);
          background: linear-gradient(160deg, rgba(15,18,25,0.98), rgba(9,12,19,0.98));
          box-shadow: 0 20px 70px rgba(0,0,0,0.45), 0 0 30px rgba(245,194,0,0.1);
          padding: 24px;
        }
        @keyframes consultationButtonPulse {
          0%, 82%, 100% { transform: scale(1); box-shadow: 0 0 24px rgba(245,194,0,0.3); }
          88% { transform: scale(1.06); box-shadow: 0 0 34px rgba(245,194,0,0.45); }
          94% { transform: scale(0.98); box-shadow: 0 0 18px rgba(245,194,0,0.24); }
        }
        @media (max-width: 480px) {
          .results-shell { padding-bottom: 142px; }
          .pdf-desktop-card { display: none; }
          .pdf-card-inner { flex-direction: column; align-items: stretch; }
          .pdf-dl-btn { display: none; }
          .mobile-dl-btn { display: flex; }
          .assessment-grid { grid-template-columns: 1fr; }
          .consultation-form-schedule { grid-template-columns: 1fr; }
          .consultation-time-grid { grid-template-columns: 1fr; }
          .consultation-button-wrap {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 20;
            padding: 12px 16px calc(18px + env(safe-area-inset-bottom, 0px));
            margin: 0;
            justify-content: stretch;
            background: rgba(8,11,18,0.96);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-top: 1px solid rgba(245,194,0,0.16);
            box-shadow: 0 -10px 30px rgba(0,0,0,0.35);
          }
          .consultation-button {
            width: 100%;
            justify-content: center;
            border-radius: 14px !important;
            padding: 14px 18px !important;
            animation: none;
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,194,0,0.07), transparent)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {showConsultationForm && (
        <div className="consultation-form-overlay" onClick={closeConsultationForm}>
          <div className="consultation-form-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
              <div style={{ textAlign: "left" }}>
                <p style={{ color: "#f2f0eb", fontSize: "1.2rem", fontWeight: 700, marginBottom: "6px" }}>Book Your Online Consultation</p>
                <p style={{ color: "#8a8a8a", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Fill in your details and choose a consultation slot between 10:00 AM and 7:00 PM. Each consultation lasts 30 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={closeConsultationForm}
                style={{ background: "none", border: "none", color: "#8a8a8a", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form className="consultation-form-grid" onSubmit={handleConsultationSubmit}>
              <div className="consultation-form-field">
                <label className="consultation-form-label" htmlFor="consultation-name">Name</label>
                <input
                  id="consultation-name"
                  className="consultation-form-input"
                  value={consultationForm.name}
                  onChange={(event) => handleConsultationFieldChange("name", event.target.value)}
                  placeholder="Enter your name"
                />
                {consultationErrors.name ? <span className="consultation-form-error">{consultationErrors.name}</span> : null}
              </div>

              <div className="consultation-form-field">
                <label className="consultation-form-label" htmlFor="consultation-phone">Phone Number</label>
                <input
                  id="consultation-phone"
                  className="consultation-form-input"
                  value={consultationForm.phone}
                  onChange={(event) => handleConsultationFieldChange("phone", event.target.value)}
                  placeholder="Enter your phone number"
                />
                {consultationErrors.phone ? <span className="consultation-form-error">{consultationErrors.phone}</span> : null}
              </div>

              <div className="consultation-form-schedule">
                <div className="consultation-form-field">
                  <label className="consultation-form-label" htmlFor="consultation-date">Date</label>
                  <input
                    id="consultation-date"
                    type="date"
                    min={today}
                    className="consultation-form-input"
                    value={consultationForm.date}
                    onChange={(event) => handleConsultationFieldChange("date", event.target.value)}
                  />
                  {consultationErrors.date ? <span className="consultation-form-error">{consultationErrors.date}</span> : null}
                </div>

                <div className="consultation-form-field">
                  <label className="consultation-form-label">Timings</label>
                  <button
                    type="button"
                    className={`consultation-time-trigger${consultationForm.time ? "" : " empty"}`}
                    onClick={() => setShowTimePicker(true)}
                  >
                    {consultationForm.time || "Select time slot"}
                  </button>
                  {consultationErrors.time ? <span className="consultation-form-error">{consultationErrors.time}</span> : null}
                </div>
              </div>

              <div className="consultation-form-actions">
                <button type="button" className="consultation-form-secondary" onClick={closeConsultationForm}>
                  Cancel
                </button>
                <button type="submit" className="consultation-form-primary" disabled={consultationSaving}>
                  {consultationSaving ? "Submitting..." : "Confirm Consultation"}
                </button>
              </div>
            </form>

            {consultationSubmitError ? (
              <div className="consultation-form-success" style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#fecaca" }}>
                {consultationSubmitError}
              </div>
            ) : null}
            {consultationSubmitted ? (
              <div className="consultation-form-success">
                Consultation request captured for {consultationForm.name} on {consultationForm.date} at {consultationForm.time}.
              </div>
            ) : null}
          </div>
        </div>
      )}
      {showTimePicker && (
        <div className="consultation-time-modal" onClick={() => setShowTimePicker(false)}>
          <div className="consultation-time-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
              <div style={{ textAlign: "left" }}>
                <p style={{ color: "#f2f0eb", fontSize: "1.1rem", fontWeight: 700, marginBottom: "6px" }}>Choose Consultation Time</p>
                <p style={{ color: "#8a8a8a", fontSize: "0.88rem" }}>Select one 30-minute slot between 10 AM and 7 PM.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                style={{ background: "none", border: "none", color: "#8a8a8a", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
              >
                Close
              </button>
            </div>
            <div className="consultation-time-grid">
              {consultationTimeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`consultation-time-slot${consultationForm.time === slot ? " active" : ""}`}
                  onClick={() => {
                    handleConsultationFieldChange("time", slot)
                    setShowTimePicker(false)
                  }}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "32px 16px 60px" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            color: "#8a8a8a",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "32px",
            padding: "0",
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Home
        </button>

        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              margin: "0 auto 16px",
              border: "1px solid rgba(245,194,0,0.4)",
              background: "rgba(245,194,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 30px rgba(245,194,0,0.2)",
            }}
          >
            <CheckCircle2 style={{ width: 30, height: 30, color: "#F5C200" }} />
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em" }}>
            Here's what we found based on your AI Hair Scan.
          </h1>
          <p style={{ color: "#8a8a8a", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: "620px", margin: "0 auto" }}>
            Your photos have been analysed using our AI Hair Scan to generate your personalised hair health report. One of our hair specialists will review your results and get in touch with you within the next 24 hours.
          </p>
          <div style={{ margin: "20px auto 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <div style={{ height: "1px", width: 40, background: "linear-gradient(90deg, transparent, rgba(245,194,0,0.5))" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F5C200", boxShadow: "0 0 6px rgba(245,194,0,0.8)" }} />
            <div style={{ height: "1px", width: 40, background: "linear-gradient(270deg, transparent, rgba(245,194,0,0.5))" }} />
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={pdfGenerating}
          className="mobile-dl-btn"
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            marginBottom: "20px",
            background: "#F5C200",
            color: "#080b12",
            border: "none",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: pdfGenerating ? "not-allowed" : "pointer",
            opacity: pdfGenerating ? 0.7 : 1,
            boxShadow: "0 0 24px rgba(245,194,0,0.3)",
          }}
        >
          {pdfGenerating ? (
            <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
          ) : (
            <Download style={{ width: 18, height: 18 }} />
          )}
          {pdfGenerating ? "Generating..." : "Know more about hair doc"}
        </button>

        <div
          style={{
            background: "linear-gradient(145deg, #0e1118, #0a0d15)",
            border: "1px solid rgba(245,194,0,0.2)",
            borderRadius: "18px",
            padding: "28px",
            marginBottom: "20px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(245,194,0,0.07)",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #F5C200, transparent)" }} />
          <p style={{ lineHeight: 1.8, color: "#9a9a9a", fontSize: "0.95rem" }}>
            In the meantime, you can download your personalised report to better understand your current hair and scalp condition.
          </p>
        </div>

        <div
          className="pdf-desktop-card"
          style={{
            background: "linear-gradient(135deg, rgba(245,194,0,0.12), rgba(245,194,0,0.04))",
            border: "1px solid rgba(245,194,0,0.35)",
            borderRadius: "18px",
            padding: "24px 28px",
            marginBottom: "20px",
            marginInline: "auto",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 30px rgba(245,194,0,0.08)",
            width: "fit-content",
            maxWidth: "100%",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #F5C200, transparent)" }} />
          <div className="pdf-card-inner">
            <button
              onClick={handleDownload}
              disabled={pdfGenerating}
              className="pdf-dl-btn"
              style={{
                alignItems: "center",
                gap: "8px",
                background: "#F5C200",
                color: "#080b12",
                border: "none",
                borderRadius: "10px",
                padding: "11px 22px",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: pdfGenerating ? "not-allowed" : "pointer",
                opacity: pdfGenerating ? 0.7 : 1,
                boxShadow: "0 0 20px rgba(245,194,0,0.3)",
                transition: "all 0.2s",
              }}
            >
              {pdfGenerating ? (
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <Download style={{ width: 16, height: 16 }} />
              )}
              {pdfGenerating ? "Generating..." : "Know more about hair doc"}
            </button>
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(145deg, #0e1118, #0a0d15)",
            border: "1px solid rgba(245,194,0,0.15)",
            borderRadius: "18px",
            padding: "28px",
            textAlign: "center",
            marginBottom: "30px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <p style={{ color: "#f2f0eb", fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>
            Want an Expert to Review Your Results?
          </p>
          <p style={{ color: "#8a8a8a", fontSize: "0.92rem", lineHeight: 1.8, marginBottom: "20px" }}>
            Your AI report is the first step. During your 1:1 consultation, a HairDoc specialist will review your results, answer your questions, and recommend a personalised treatment plan based on your scalp condition, medical history, and hair goals.
          </p>
          <div style={{ maxWidth: "560px", margin: "0 auto 24px", color: "#f2f0eb" }}>
            <p style={{ fontWeight: 700, marginBottom: "12px" }}>Your Personal Hair Assessment Includes:</p>
            <div className="assessment-grid">
              <div className="assessment-card">Hair loss assessment</div>
              <div className="assessment-card">Scalp health insights</div>
              <div className="assessment-card">Hair loss stage (if detected)</div>
              <div className="assessment-card">Possible contributing factors</div>
              <div className="assessment-card">Recommended next steps</div>
              <div className="assessment-card">Personalised treatment recommendations</div>
            </div>
          </div>
          <div className="consultation-button-wrap">
            <button
              type="button"
              onClick={openConsultationForm}
              className="consultation-button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#F5C200",
                color: "#080b12",
                borderRadius: "10px",
                border: "none",
                padding: "12px 28px",
                fontSize: "1rem",
                fontWeight: 700,
                boxShadow: "0 0 24px rgba(245,194,0,0.3)",
                transition: "all 0.2s",
                cursor: "pointer",
              }}
            >
              Book Your Online Consultation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
