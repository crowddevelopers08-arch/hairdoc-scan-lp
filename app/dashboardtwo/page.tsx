import { ScanDashboard } from "@/components/scan-dashboard"
import { prismaDashboardTwo } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

type DashboardSearchParams = Promise<{
  q?: string
  problem?: string
  location?: string
  dateFrom?: string
  dateTo?: string
  page?: string
}>

export default async function DashboardTwoPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams
}) {
  return (
    <ScanDashboard
      searchParams={searchParams}
      prismaClient={prismaDashboardTwo}
      basePath="/dashboardtwo"
      title="Scan Dashboard Two"
    />
  )
}
