import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { Prisma, PrismaClient } from "@prisma/client"

const problemLabels: Record<string, string> = {
  "hair-fall": "Hair Fall",
  "crown-thinning": "Crown Thinning",
  "frontal-hair-loss": "Frontal Hair Loss",
  "dandruff-scalp-issues": "Dandruff / Scalp Issues",
  "low-hair-density": "Low Hair Density",
  "acne": "Acne",
  "pigmentation": "Pigmentation",
  "dullness": "Dullness",
  "tanning": "Tanning",
  "uneven-skin-tone": "Uneven Skin Tone",
  "open-pores": "Open Pores",
}

const hairProblems = [
  "hair-fall",
  "crown-thinning",
  "frontal-hair-loss",
  "dandruff-scalp-issues",
  "low-hair-density",
]

const skinProblems = [
  "acne",
  "pigmentation",
  "dullness",
  "tanning",
  "uneven-skin-tone",
  "open-pores",
]

type DashboardSearchParams = Promise<{
  q?: string
  problem?: string
  location?: string
  dateFrom?: string
  dateTo?: string
  page?: string
}>

const pageSize = 100

const dashboardScanSelect = {
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

type DashboardScan = Prisma.ScanGetPayload<{
  select: typeof dashboardScanSelect
}>

function isHairProblem(problem: string): boolean {
  return hairProblems.includes(problem)
}

function matchesDateFilter(scanDate: Date, dateFrom: string, dateTo: string) {
  const scanDay = new Date(scanDate)
  scanDay.setHours(0, 0, 0, 0)

  if (dateFrom) {
    const from = new Date(dateFrom)
    from.setHours(0, 0, 0, 0)
    if (scanDay < from) return false
  }

  if (dateTo) {
    const to = new Date(dateTo)
    to.setHours(23, 59, 59, 999)
    if (scanDay > to) return false
  }

  return true
}

function parseDateBoundary(date: string, boundary: "start" | "end") {
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

function parsePage(page: string | undefined) {
  const parsed = Number(page)
  if (!Number.isInteger(parsed) || parsed < 1) return 1

  return parsed
}

function buildDashboardUrl(
  basePath: string,
  params: {
    q?: string
    problem?: string
    location?: string
    dateFrom?: string
    dateTo?: string
  },
  page: number,
) {
  const searchParams = new URLSearchParams()

  if (params.q) searchParams.set("q", params.q)
  if (params.problem) searchParams.set("problem", params.problem)
  if (params.location) searchParams.set("location", params.location)
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom)
  if (params.dateTo) searchParams.set("dateTo", params.dateTo)
  if (page > 1) searchParams.set("page", String(page))

  const queryString = searchParams.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

function buildExportUrl(
  basePath: string,
  params: {
    q?: string
    problem?: string
    location?: string
    dateFrom?: string
    dateTo?: string
  },
) {
  const searchParams = new URLSearchParams()

  if (basePath === "/dashboardtwo") searchParams.set("source", "dashboardtwo")
  if (params.q) searchParams.set("q", params.q)
  if (params.problem) searchParams.set("problem", params.problem)
  if (params.location) searchParams.set("location", params.location)
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom)
  if (params.dateTo) searchParams.set("dateTo", params.dateTo)

  const queryString = searchParams.toString()
  return queryString ? `/api/export-leads?${queryString}` : "/api/export-leads"
}

function getDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (message.toLowerCase().includes("data transfer quota")) {
    return "Neon has paused database reads because this project exceeded its data transfer quota. Upgrade the Neon plan or wait for the quota reset, then refresh this dashboard."
  }

  return "The dashboard could not load scan records right now. Please refresh in a moment."
}

function getCleanDisplayUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.split("?")[0]
  }
}

export async function ScanDashboard({
  searchParams,
  prismaClient,
  basePath,
  title,
}: {
  searchParams?: DashboardSearchParams
  prismaClient: PrismaClient
  basePath: string
  title: string
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const query = resolvedSearchParams.q?.trim().toLowerCase() ?? ""
  const selectedProblem = resolvedSearchParams.problem ?? ""
  const selectedLocation = resolvedSearchParams.location?.trim() ?? ""
  const selectedDateFrom = resolvedSearchParams.dateFrom ?? ""
  const selectedDateTo = resolvedSearchParams.dateTo ?? ""
  const currentPage = parsePage(resolvedSearchParams.page)

  const createdAt: Prisma.DateTimeFilter = {}
  const dateFrom = parseDateBoundary(selectedDateFrom, "start")
  const dateTo = parseDateBoundary(selectedDateTo, "end")

  if (dateFrom) createdAt.gte = dateFrom
  if (dateTo) createdAt.lte = dateTo

  const where: Prisma.ScanWhereInput = {
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

  let scans: DashboardScan[] = []
  let filteredCount = 0
  let totalCount = 0
  let databaseError = ""
  let locationOptions: string[] = []

  try {
    const [scanRows, matchingRows, allRows, locationRows] = await Promise.all([
      prismaClient.scan.findMany({
        where,
        select: dashboardScanSelect,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      prismaClient.scan.count({ where }),
      prismaClient.scan.count(),
      prismaClient.scan.findMany({
        where: {
          location: {
            not: "",
          },
        },
        select: {
          location: true,
        },
        distinct: ["location"],
        orderBy: {
          location: "asc",
        },
      }),
    ])

    scans = scanRows
    filteredCount = matchingRows
    totalCount = allRows
    locationOptions = locationRows
      .map((row) => row.location.trim())
      .filter(Boolean)
  } catch (error) {
    console.error("Failed to load dashboard scans:", error)
    databaseError = getDatabaseErrorMessage(error)
  }

  const filteredScans = scans.filter((scan) =>
    matchesDateFilter(scan.createdAt, selectedDateFrom, selectedDateTo),
  )

  const hairScans = filteredScans.filter((scan) => isHairProblem(scan.problem))
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize))
  const hasNewerPage = currentPage > 1
  const hasOlderPage = currentPage < totalPages
  const newerPageUrl = buildDashboardUrl(basePath, resolvedSearchParams, currentPage - 1)
  const olderPageUrl = buildDashboardUrl(basePath, resolvedSearchParams, currentPage + 1)
  const exportUrl = buildExportUrl(basePath, resolvedSearchParams)

  const renderScanGrid = (scans: DashboardScan[], title: string) => (
    <section className="rounded-3xl border border-border bg-card/60 p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {scans.length} {scans.length === 1 ? "record" : "records"}
          </p>
        </div>
      </div>

      {scans.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-background/70 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} match the current filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {scans.map((scan) => (
            <article
              key={scan.id}
              className="overflow-hidden rounded-2xl border border-border bg-background"
            >
              <div className="relative flex h-40 w-full items-center justify-center bg-muted">
                {scan.imageData ? (
                  <img
                    src={scan.imageData}
                    alt={`${scan.name}'s scan`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-xl font-bold text-foreground">
                    {scan.name.trim().charAt(0).toUpperCase() || "L"}
                  </div>
                )}
                <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {problemLabels[scan.problem] ?? scan.problem}
                </span>
              </div>

              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{scan.name}</p>
                  <p className="text-xs text-muted-foreground">#{scan.id}</p>
                </div>
                <p className="text-sm text-muted-foreground">{scan.phone}</p>
                {scan.location && (
                  <p className="text-sm text-muted-foreground">{scan.location}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {scan.formName || "website leads"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      scan.telecrmStatus.toLowerCase() === "created" ||
                      scan.telecrmStatus.toLowerCase() === "updated" ||
                      scan.telecrmStatus.toLowerCase() === "submitted"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    TeleCRM: {scan.telecrmStatus || "pending"}
                  </span>
                </div>
                {scan.pageUrl && (
                  <a
                    href={scan.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-sm font-medium text-primary hover:underline"
                  >
                    {getCleanDisplayUrl(scan.pageUrl)}
                  </a>
                )}
                {scan.telecrmLeadIds && (
                  <p className="text-xs text-muted-foreground">
                    CRM ID: {scan.telecrmLeadIds}
                  </p>
                )}
                {scan.telecrmError && (
                  <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                    {scan.telecrmError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(scan.createdAt).toLocaleString(undefined, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-muted-foreground">
            {databaseError ? (
              "Database records are temporarily unavailable."
            ) : (
              <>
                {filteredCount} filtered {filteredCount === 1 ? "record" : "records"}
                {" "}from {totalCount} total
                {filteredCount > 0 && (
                  <>. Page {currentPage} of {totalPages}.</>
                )}
              </>
            )}
          </p>
        </div>

        {databaseError && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            {databaseError}
          </div>
        )}

        <form className="grid gap-4 rounded-3xl border border-border bg-card/60 p-5 shadow-sm md:grid-cols-4">
          <div>
            <label htmlFor="dashboard-search" className="mb-2 block text-sm font-medium text-foreground">
              Search by name or phone
            </label>
            <input
              id="dashboard-search"
              name="q"
              defaultValue={resolvedSearchParams.q ?? ""}
              placeholder="Search leads..."
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="dashboard-problem" className="mb-2 block text-sm font-medium text-foreground">
              Concern
            </label>
            <select
              id="dashboard-problem"
              name="problem"
              defaultValue={selectedProblem}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">All concerns</option>
              <optgroup label="Hair leads">
                {hairProblems.map((problem) => (
                  <option key={problem} value={problem}>
                    {problemLabels[problem]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Skin leads">
                {skinProblems.map((problem) => (
                  <option key={problem} value={problem}>
                    {problemLabels[problem]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="dashboard-location" className="mb-2 block text-sm font-medium text-foreground">
              Location
            </label>
            <select
              id="dashboard-location"
              name="location"
              defaultValue={selectedLocation}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">All locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Date range
            </label>
            <DateRangePicker
              defaultFrom={selectedDateFrom}
              defaultTo={selectedDateTo}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 md:col-span-4">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Apply Filters
            </button>
            <a
              href={basePath}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Reset
            </a>
            <a
              href={exportUrl}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-primary bg-background px-5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Download Excel
            </a>
          </div>
        </form>

        {!databaseError && filteredCount > pageSize && (
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card/60 p-4 text-sm">
            <p className="text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredCount)} of {filteredCount}
            </p>
            <div className="flex gap-3">
              {hasNewerPage ? (
                <a
                  href={newerPageUrl}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-semibold text-foreground transition hover:bg-muted"
                >
                  Newer
                </a>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 font-semibold text-muted-foreground opacity-50">
                  Newer
                </span>
              )}
              {hasOlderPage ? (
                <a
                  href={olderPageUrl}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Older
                </a>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-xl bg-muted px-4 font-semibold text-muted-foreground opacity-50">
                  Older
                </span>
              )}
            </div>
          </nav>
        )}

        <div className="grid gap-6">
          {renderScanGrid(hairScans, "Hair Leads")}
        </div>
      </div>
    </main>
  )
}
