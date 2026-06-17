import { NextRequest, NextResponse } from "next/server"
import { prisma, prismaDashboardTwo } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"

export const runtime = "nodejs"

const HAS_DASHBOARD_TWO_DB = Boolean(
  process.env.DASHBOARD_TWO_POSTGRES_PRISMA_URL || process.env.DASHBOARD_TWO_DATABASE_URL,
)

const FORM_NAME = "website leads"
const DUPLICATE_PHONE_ERROR = "This mobile number has already been used to submit a lead."

function getRequestOrigin(req: NextRequest) {
  const protocol = req.headers.get("x-forwarded-proto") ?? "https"
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  return host ? `${protocol}://${host}` : ""
}

function normalizeUrl(pageUrl: unknown, req: NextRequest) {
  const submittedUrl = typeof pageUrl === "string" ? pageUrl.trim() : ""
  if (submittedUrl) return submittedUrl
  const referer = req.headers.get("referer")?.trim()
  if (referer) return referer
  return getRequestOrigin(req)
}

function getPhoneDuplicateKey(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return digits.length > 10 ? digits.slice(-10) : digits
}

function extractEnterpriseId(apiUrl: string): string {
  return apiUrl.match(/\/enterprise\/([^/]+)\//)?.[1] ?? ""
}

async function findDuplicateScanByPhone(client: PrismaClient, phone: string) {
  const key = getPhoneDuplicateKey(phone)
  if (!key) return null
  const scans = await client.scan.findMany({ select: { id: true, phone: true } })
  return scans.find((s) => getPhoneDuplicateKey(s.phone) === key) ?? null
}

async function uploadImageToTelecrmLead(leadId: string, imageData: string, apiKey: string, enterpriseId: string) {
  try {
    const [header, base64] = imageData.split(",")
    const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg"
    const ext = mimeType.split("/")[1] || "jpg"
    const buffer = Buffer.from(base64, "base64")
    const formData = new FormData()
    formData.append("file", new Blob([buffer], { type: mimeType }), `hair-scan.${ext}`)
    const res = await fetch(
      `https://next-api.telecrm.in/v2/enterprise/${enterpriseId}/lead/${leadId}/uploadfile`,
      { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey, "api-key": apiKey }, body: formData },
    )
    console.log(`[TeleCRM] Image upload for lead ${leadId}: HTTP ${res.status}`)
  } catch (err) {
    console.error(`[TeleCRM] Image upload error for lead ${leadId}:`, err)
  }
}

async function addNoteToTelecrmLead(leadId: string, name: string, phone: string, imageUrl: string, apiKey: string, enterpriseId: string) {
  try {
    const note = [`Hair Scan Lead`, `Name: ${name}`, `Phone: ${phone}`, imageUrl ? `Scan Image: ${imageUrl}` : ""]
      .filter(Boolean).join("\n")
    const res = await fetch(
      `https://next-api.telecrm.in/v2/enterprise/${enterpriseId}/addnote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey, "api-key": apiKey },
        body: JSON.stringify({ leadId, note, content: note }),
      },
    )
    console.log(`[TeleCRM] Add note for lead ${leadId}: HTTP ${res.status}`)
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[TeleCRM] Note error body:`, body)
    }
  } catch (err) {
    console.error(`[TeleCRM] Note error for lead ${leadId}:`, err)
  }
}

async function syncTelecrmLead(name: string, phone: string, pageUrl: string, imageUrl: string) {
  const apiUrl = process.env.TELECRM_API_URL
  const apiKey = process.env.TELECRM_API_KEY

  if (!apiUrl || !apiKey) {
    console.error("[TeleCRM] Missing API URL or key")
    return { ok: false, status: "missing_config", leadIds: "", leadIdsArr: [] as string[], error: "TeleCRM not configured." }
  }

  const note = [`Hair Scan Lead`, `Name: ${name}`, `Phone: ${phone}`, imageUrl ? `Scan Image: ${imageUrl}` : ""]
    .filter(Boolean).join("\n")

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "api-key": apiKey,
      },
      body: JSON.stringify({
        fields: { phone, name, form_name: FORM_NAME, source: FORM_NAME, website_url: pageUrl, live_url: pageUrl, scan_image_url: imageUrl },
        note,
        remark: note,
      }),
    })

    const body = await response.json().catch(() => null)
    console.log("[TeleCRM] autoupdatelead response:", JSON.stringify(body))

    // TeleCRM may return status, result, or neither
    const rawStatus = body?.status || body?.result
    const status = rawStatus != null && rawStatus !== "" ? String(rawStatus) : response.ok ? "Submitted" : "Error"
    const rawError = body?.errorString
    const error = typeof rawError === "string" && rawError ? rawError : response.ok ? "" : `HTTP ${response.status}`
    const leadIdsArr: string[] = Array.isArray(body?.modifiedLeadIds)
      ? body.modifiedLeadIds.map(String)
      : typeof body?.modifiedLeadIds === "string" && body.modifiedLeadIds
        ? [body.modifiedLeadIds]
        : []

    console.log(`[TeleCRM] status="${status}" leadIds=${JSON.stringify(leadIdsArr)}`)

    return { ok: response.ok && status.toLowerCase() !== "error", status, leadIds: leadIdsArr.join(", "), leadIdsArr, error }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TeleCRM request failed."
    console.error("[TeleCRM] fetch error:", msg)
    return { ok: false, status: "failed", leadIds: "", leadIdsArr: [] as string[], error: msg }
  }
}

async function createScanRecord(client: PrismaClient, data: {
  name: string; phone: string; location: string; problem: string
  imageData: string; pageUrl: string; formName: string
}, preventDuplicate: boolean) {
  if (preventDuplicate) {
    const existing = await findDuplicateScanByPhone(client, data.phone)
    if (existing) return { id: null, duplicate: true }
  }
  const scan = await client.scan.create({ data })
  return { id: scan.id, duplicate: false }
}

async function saveTelecrmStatus(client: PrismaClient, id: number | null, telecrm: { status: string; leadIds: string; error: string }) {
  if (!id) return
  try {
    await client.scan.update({
      where: { id },
      data: {
        telecrmStatus: String(telecrm.status || ""),
        telecrmLeadIds: String(telecrm.leadIds || ""),
        telecrmError: String(telecrm.error || ""),
      },
    })
    console.log(`[DB] Updated scan ${id} telecrmStatus="${telecrm.status}"`)
  } catch (err) {
    console.error(`[DB] Failed to update scan ${id} TeleCRM status:`, err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, location, problem, imageData, pageUrl } = await req.json()

    if (!name || !phone || !problem || !imageData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const normalizedPhone = String(phone).trim()
    const normalizedName = String(name).trim()
    const normalizedLocation = typeof location === "string" ? location.trim() : ""
    const normalizedProblem = String(problem).trim()
    const normalizedPageUrl = normalizeUrl(pageUrl, req)

    const scanData = {
      name: normalizedName, phone: normalizedPhone, location: normalizedLocation,
      problem: normalizedProblem, imageData, pageUrl: normalizedPageUrl, formName: FORM_NAME,
    }

    let scanId: number | null = null
    let dashboardTwoScanId: number | null = null

    try {
      const result = await createScanRecord(prisma, scanData, true)
      if (result.duplicate) {
        return NextResponse.json({ error: DUPLICATE_PHONE_ERROR }, { status: 409 })
      }
      scanId = result.id
      console.log(`[DB] Scan saved with id=${scanId}`)
    } catch (err) {
      console.error("[DB] Primary save failed:", err)
    }

    if (HAS_DASHBOARD_TWO_DB) {
      try {
        const result = await createScanRecord(prismaDashboardTwo, scanData, false)
        dashboardTwoScanId = result.id
      } catch (err) {
        console.error("[DB] Dashboard-two save failed:", err)
      }
    }

    const origin = getRequestOrigin(req)
    const imageUrl = scanId ? `${origin}/api/scan-image/${scanId}` : ""

    // Call TeleCRM and get status
    const telecrm = await syncTelecrmLead(normalizedName, normalizedPhone, normalizedPageUrl, imageUrl)

    // Save TeleCRM status to DB immediately
    await saveTelecrmStatus(prisma, scanId, telecrm)
    if (HAS_DASHBOARD_TWO_DB) {
      await saveTelecrmStatus(prismaDashboardTwo, dashboardTwoScanId, telecrm)
    }

    // Await lead search + note/image upload inline so it completes before response
    if (process.env.TELECRM_API_URL && process.env.TELECRM_API_KEY && telecrm.ok) {
      const apiKey = process.env.TELECRM_API_KEY
      const enterpriseId = extractEnterpriseId(process.env.TELECRM_API_URL)
      try {
        const phone10 = normalizedPhone.replace(/\D/g, "").slice(-10)
        let leadIds = telecrm.leadIdsArr

        if (leadIds.length === 0) {
          // Try GET /leads?phone=xxx
          const getRes = await fetch(
            `https://next-api.telecrm.in/v2/enterprise/${enterpriseId}/leads?phone=${phone10}`,
            { headers: { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey, "api-key": apiKey } },
          )
          const getRaw = await getRes.text().catch(() => "")
          console.log(`[TeleCRM] GET leads HTTP ${getRes.status}:`, getRaw.slice(0, 400))
          try {
            const b = JSON.parse(getRaw) as Record<string, unknown>
            const arr = (b?.data as Record<string, unknown>)?.leads ?? b?.leads ?? b?.data ?? []
            if (Array.isArray(arr) && arr.length > 0) {
              leadIds = [String(arr[0]._id ?? arr[0].id ?? arr[0].leadId ?? "")].filter(Boolean)
              console.log("[TeleCRM] Found lead IDs:", leadIds)
            }
          } catch { /* not JSON */ }
        }

        if (leadIds.length > 0) {
          await Promise.all(
            leadIds.flatMap((leadId) => [
              imageData ? uploadImageToTelecrmLead(leadId, imageData, apiKey, enterpriseId) : Promise.resolve(),
              addNoteToTelecrmLead(leadId, normalizedName, normalizedPhone, imageUrl, apiKey, enterpriseId),
            ]),
          )
        } else {
          // Fallback: try addnote identified by phone (no leadId)
          const noteText = [`Hair Scan Lead`, `Name: ${normalizedName}`, `Phone: ${normalizedPhone}`, imageUrl ? `Scan Image: ${imageUrl}` : ""].filter(Boolean).join("\n")
          const noteRes = await fetch(
            `https://next-api.telecrm.in/v2/enterprise/${enterpriseId}/addnote`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey, "api-key": apiKey },
              body: JSON.stringify({ phone: phone10, note: noteText, content: noteText }),
            },
          )
          const noteRaw = await noteRes.text().catch(() => "")
          console.log(`[TeleCRM] addnote by phone HTTP ${noteRes.status}:`, noteRaw.slice(0, 300))
        }
      } catch (err) {
        console.error("[TeleCRM] Note error:", err)
      }
    }

    return NextResponse.json({
      success: true,
      id: scanId,
      dashboardTwoId: dashboardTwoScanId,
      telecrm: { status: telecrm.status, leadIds: telecrm.leadIds, ok: telecrm.ok },
    })
  } catch (err) {
    console.error("[SaveScan] Unhandled error:", err)
    const message = err instanceof Error ? `Failed to save scan: ${err.message}` : "Failed to save scan"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
