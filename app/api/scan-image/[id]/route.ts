import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const scanId = parseInt(id, 10)
    if (isNaN(scanId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { imageData: true } })
    if (!scan?.imageData) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [header, base64] = scan.imageData.split(",")
    const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg"
    const buffer = Buffer.from(base64, "base64")

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
}
