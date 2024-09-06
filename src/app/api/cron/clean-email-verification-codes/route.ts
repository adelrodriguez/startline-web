import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { StatusCodes } from "http-status-codes"
import { NextResponse } from "next/server"
import env from "~/lib/env.server"
import { cleanExpiredEmailVerificationCodes } from "~/server/data"

async function handler() {
  const rows = await cleanExpiredEmailVerificationCodes()

  return NextResponse.json({ success: true, rows }, { status: StatusCodes.OK })
}

export const POST = env.MOCK_QSTASH
  ? handler
  : verifySignatureAppRouter(handler)
