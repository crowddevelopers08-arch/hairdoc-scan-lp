import { NextRequest, NextResponse } from "next/server"
import { prisma, prismaDashboardTwo } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"

export const runtime = "nodejs"

// Only write to the secondary DB when a distinct URL is explicitly configured.
const HAS_DASHBOARD_TWO_DB = Boolean(
  process.env.DASHBOARD_TWO_POSTGRES_PRISMA_URL || process.env.DASHBOARD_TWO_DATABASE_URL,
)

const FORM_NAME = "website leads"
const DUPLICATE_PHONE_ERROR = "This mobile number has already been used to submit a lead."

type TelecrmResponse = {
  modifiedLeadIds?: string[]
  status?: string
  errorString?: string
}

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

  if (digits.length > 10) {
    return digits.slice(-10)
  }

  return digits
}

async function findDuplicateScanByPhone(client: PrismaClient, phone: string) {
  const submittedPhoneKey = getPhoneDuplicateKey(phone)

  if (!submittedPhoneKey) {
    return null
  }

  const existingScans = await client.scan.findMany({
    select: {
      id: true,
      phone: true,
    },
  })

  return existingScans.find((scan) => getPhoneDuplicateKey(scan.phone) === submittedPhoneKey) ?? null
}

async function syncTelecrmLead({
  name,
  phone,
  location,
  problem,
  pageUrl,
}: {
  name: string
  phone: string
  location: string
  problem: string
  pageUrl: string
}) {
  const apiUrl = process.env.TELECRM_API_URL
  const apiKey = process.env.TELECRM_API_KEY

  if (!apiUrl || !apiKey) {
    return {
      ok: false,
      status: "missing_config",
      leadIds: "",
      error: "TeleCRM URL or API key is not configured.",
    }
  }

  const payload = {
    fields: {
      phone,
      name,
      location,
      problem,
      form_name: FORM_NAME,
      source: FORM_NAME,
      lead_source: FORM_NAME,
      website_url: pageUrl,
      page_url: pageUrl,
      live_url: pageUrl,
    },
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json().catch(() => null)) as TelecrmResponse | null
    const status = body?.status ?? (response.ok ? "Submitted" : "Error")
    const error = body?.errorString ?? (response.ok ? "" : `TeleCRM returned HTTP ${response.status}`)
    const leadIds = Array.isArray(body?.modifiedLeadIds) ? body.modifiedLeadIds.join(", ") : ""

    return {
      ok: response.ok && status.toLowerCase() !== "error",
      status,
      leadIds,
      error,
    }
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      leadIds: "",
      error: error instanceof Error ? error.message : "TeleCRM request failed.",
    }
  }
}

async function createScanRecord({
  client,
  data,
  preventDuplicate,
}: {
  client: PrismaClient
  data: {
    name: string
    phone: string
    location: string
    problem: string
    imageData: string
    pageUrl: string
    formName: string
  }
  preventDuplicate: boolean
}) {
  if (preventDuplicate) {
    const existing = await findDuplicateScanByPhone(client, data.phone)

    if (existing) {
      return { id: null, duplicate: true }
    }
  }

  const scan = await client.scan.create({ data })

  return { id: scan.id, duplicate: false }
}

async function updateScanTelecrmStatus({
  client,
  id,
  telecrm,
}: {
  client: PrismaClient
  id: number | null
  telecrm: Awaited<ReturnType<typeof syncTelecrmLead>>
}) {
  if (!id) return

  await client.scan.update({
    where: { id },
    data: {
      telecrmStatus: telecrm.status,
      telecrmLeadIds: telecrm.leadIds,
      telecrmError: telecrm.error,
    },
  })
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
      name: normalizedName,
      phone: normalizedPhone,
      location: normalizedLocation,
      problem: normalizedProblem,
      imageData,
      pageUrl: normalizedPageUrl,
      formName: FORM_NAME,
    }

    let scanId: number | null = null
    let dashboardTwoScanId: number | null = null
    const databaseErrors: string[] = []

    try {
      const primarySave = await createScanRecord({
        client: prisma,
        data: scanData,
        preventDuplicate: true,
      })

      if (primarySave.duplicate) {
        return NextResponse.json(
          { error: DUPLICATE_PHONE_ERROR },
          { status: 409 },
        )
      }

      scanId = primarySave.id
    } catch (error) {
      databaseErrors.push("Primary database save failed, but TeleCRM was attempted.")
      console.error("Primary database save failed; continuing with TeleCRM:", error)
    }

    if (HAS_DASHBOARD_TWO_DB) {
      try {
        const dashboardTwoSave = await createScanRecord({
          client: prismaDashboardTwo,
          data: scanData,
          preventDuplicate: false,
        })

        dashboardTwoScanId = dashboardTwoSave.id
      } catch (error) {
        databaseErrors.push("Dashboard two database save failed, but TeleCRM was attempted.")
        console.error("Dashboard two database save failed; continuing with TeleCRM:", error)
      }
    }

    const telecrm = await syncTelecrmLead({
      name: normalizedName,
      phone: normalizedPhone,
      location: normalizedLocation,
      problem: normalizedProblem,
      pageUrl: normalizedPageUrl,
    })

    try {
      await Promise.all([
        updateScanTelecrmStatus({ client: prisma, id: scanId, telecrm }),
        ...(HAS_DASHBOARD_TWO_DB
          ? [updateScanTelecrmStatus({ client: prismaDashboardTwo, id: dashboardTwoScanId, telecrm })]
          : []),
      ])
    } catch (error) {
      databaseErrors.push("A database status update failed after TeleCRM sync.")
      console.error("Database status update failed after TeleCRM sync:", error)
    }

    if (!telecrm.ok) {
      console.error("TeleCRM sync failed:", telecrm.error)
      if (!scanId && !dashboardTwoScanId) {
        return NextResponse.json(
          {
            error: telecrm.error || "TeleCRM sync failed",
            databaseError: databaseErrors.join(" "),
            telecrm,
          },
          { status: 502 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      id: scanId,
      dashboardTwoId: dashboardTwoScanId,
      savedToDatabase: Boolean(scanId),
      savedToDashboardTwoDatabase: Boolean(dashboardTwoScanId),
      databaseError: databaseErrors.join(" "),
      telecrm,
    })
  } catch (error) {
    console.error("Failed to save scan:", error)
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? `Failed to save scan: ${error.message}`
        : "Failed to save scan"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
