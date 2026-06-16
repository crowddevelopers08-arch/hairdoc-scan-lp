import { ScanDashboard } from "@/components/scan-dashboard"
import { prisma } from "@/lib/prisma"

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams
}) {
  return (
    <ScanDashboard
      searchParams={searchParams}
      prismaClient={prisma}
      basePath="/dashboard"
      title="Scan Dashboard"
    />
  )
}
