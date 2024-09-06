import { generateCodeVerifier, generateState } from "arctic"
import { StatusCodes } from "http-status-codes"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { google } from "~/lib/auth"
import env from "~/lib/env.server"

export async function GET(): Promise<NextResponse> {
  if (!env.AUTH_OAUTH) {
    return NextResponse.json(
      { error: "OAuth authentication is disabled" },
      { status: StatusCodes.FORBIDDEN },
    )
  }

  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  const url = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ["profile", "email"],
  })

  cookies().set("google_oauth_state", state, {
    secure: true,
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10, // Ten minutes
  })

  cookies().set("google_code_verifier", codeVerifier, {
    secure: true,
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10, // Ten minutes
  })

  return NextResponse.redirect(url)
}
