import { NextRequest, NextResponse } from "next/server"
import { prisma, prismaDashboardTwo } from "@/lib/prisma"
import type { Prisma, PrismaClient } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const problemLabels: Record<string, string> = {
  "hair-fall": "Hair Fall",
  "crown-thinning": "Crown Thinning",
  "frontal-hair-loss": "Frontal Hair Loss",
  "dandruff-scalp-issues": "Dandruff / Scalp Issues",
  "low-hair-density": "Low Hair Density",
  acne: "Acne",
  pigmentation: "Pigmentation",
  dullness: "Dullness",
  tanning: "Tanning",
  "uneven-skin-tone": "Uneven Skin Tone",
  "open-pores": "Open Pores",
}

const exportScanSelect = {
  id: true,
  name: true,
  phone: true,
  location: true,
  problem: true,
  imageData: true,
  pageUrl: true,
  formName: true,
  telecrmStatus: true,
  telecrmLeadIds: true,
  telecrmError: true,
  createdAt: true,
} satisfies Prisma.ScanSelect

type ExportScan = Prisma.ScanGetPayload<{
  select: typeof exportScanSelect
}>

function parseDateBoundary(date: string | null, boundary: "start" | "end") {
  if (!date) return undefined

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return undefined

  if (boundary === "start") {
    parsed.setHours(0, 0, 0, 0)
  } else {
    parsed.setHours(23, 59, 59, 999)
  }

  return parsed
}

function buildWhere(searchParams: URLSearchParams): Prisma.ScanWhereInput {
  const query = searchParams.get("q")?.trim().toLowerCase() ?? ""
  const selectedProblem = searchParams.get("problem") ?? ""
  const selectedLocation = searchParams.get("location")?.trim() ?? ""
  const dateFrom = parseDateBoundary(searchParams.get("dateFrom"), "start")
  const dateTo = parseDateBoundary(searchParams.get("dateTo"), "end")
  const createdAt: Prisma.DateTimeFilter = {}

  if (dateFrom) createdAt.gte = dateFrom
  if (dateTo) createdAt.lte = dateTo

  return {
    ...(selectedProblem ? { problem: selectedProblem } : {}),
    ...(selectedLocation ? { location: selectedLocation } : {}),
    ...(dateFrom || dateTo ? { createdAt } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { pageUrl: { contains: query, mode: "insensitive" } },
            { formName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date)
}

function buildExcelWorkbook(scans: ExportScan[], title: string) {
  const columns = [
    "ID",
    "Name",
    "Phone",
    "Location",
    "Concern",
    "Form Name",
    "Page URL",
    "Image Saved",
    "TeleCRM Status",
    "TeleCRM Lead IDs",
    "TeleCRM Error",
    "Created At",
  ]

  const rows = scans
    .map((scan) => {
      const values = [
        scan.id,
        scan.name,
        scan.phone,
        scan.location,
        problemLabels[scan.problem] ?? scan.problem,
        scan.formName,
        scan.pageUrl,
        scan.imageData ? "Yes" : "No",
        scan.telecrmStatus,
        scan.telecrmLeadIds,
        scan.telecrmError,
        formatDate(scan.createdAt),
      ]

      return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`
    })
    .join("")

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
      th, td { border: 1px solid #c9c9c9; padding: 8px; vertical-align: top; }
      th { background: #f1d063; font-weight: 700; }
      .title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="title">${escapeHtml(title)}</div>
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`
}

function getExportClient(source: string | null): {
  client: PrismaClient
  title: string
  fileName: string
} {
  if (source === "dashboardtwo") {
    return {
      client: prismaDashboardTwo,
      title: "Scan Dashboard Two Leads",
      fileName: "dashboard-two-leads.xls",
    }
  }

  return {
    client: prisma,
    title: "Scan Dashboard Leads",
    fileName: "dashboard-leads.xls",
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const { client, title, fileName } = getExportClient(searchParams.get("source"))

  try {
    const scans = await client.scan.findMany({
      where: buildWhere(searchParams),
      select: exportScanSelect,
      orderBy: { createdAt: "desc" },
    })

    const workbook = buildExcelWorkbook(scans, title)

    return new NextResponse(workbook, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Failed to export dashboard leads:", error)
    return NextResponse.json(
      { error: "Failed to export dashboard leads." },
      { status: 500 },
    )
  }
}
