import { PrismaClient } from "@prisma/client"

function withPoolDefaults(databaseUrl: string) {
  if (!databaseUrl) return databaseUrl

  const url = new URL(databaseUrl)
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", "3")
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", "20")
  }

  return url.toString()
}

// Runtime fallbacks for common deployment env names.
if (!process.env.POSTGRES_PRISMA_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_PRISMA_URL = process.env.DATABASE_URL
}
if (process.env.POSTGRES_PRISMA_URL) {
  process.env.POSTGRES_PRISMA_URL = withPoolDefaults(process.env.POSTGRES_PRISMA_URL)
}
if (!process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL_UNPOOLED =
    process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING || ""
}

function getDashboardTwoDatabaseUrl() {
  const databaseUrl =
    process.env.DASHBOARD_TWO_POSTGRES_PRISMA_URL ||
    process.env.DASHBOARD_TWO_DATABASE_URL ||
    ""

  return databaseUrl ? withPoolDefaults(databaseUrl) : ""
}

function createPrismaClient(databaseUrl?: string) {
  return new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : undefined,
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  prismaDashboardTwo: PrismaClient
  prismaDashboardTwoUrl: string
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

const dashboardTwoDatabaseUrl = getDashboardTwoDatabaseUrl()

export const prismaDashboardTwo =
  globalForPrisma.prismaDashboardTwo &&
  globalForPrisma.prismaDashboardTwoUrl === dashboardTwoDatabaseUrl
    ? globalForPrisma.prismaDashboardTwo
    : createPrismaClient(dashboardTwoDatabaseUrl)

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaDashboardTwo = prismaDashboardTwo
  globalForPrisma.prismaDashboardTwoUrl = dashboardTwoDatabaseUrl
}
