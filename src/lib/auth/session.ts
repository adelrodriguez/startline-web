import { getRandomValues } from "node:crypto"
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding"
import { addDays, subDays } from "date-fns"
import { StatusCodes } from "http-status-codes"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { cache } from "react"
import { SESSION_COOKIE_NAME, SESSION_LENGTH_IN_DAYS } from "~/lib/consts"
import { isProduction } from "~/lib/vars"
import {
  type Session,
  type SessionId,
  type User,
  type UserId,
  createSession,
  deleteSession,
  deleteUserSessions,
  findSessionById,
  updateSession,
} from "~/server/data/user"
import { sha } from "~/utils/hash"
import { getGeolocation, getIpAddress } from "~/utils/headers"

function generateSessionToken(): string {
  const bytes = new Uint8Array(20)

  getRandomValues(bytes)

  const token = encodeBase32LowerCaseNoPadding(bytes)

  return token
}

async function validateSessionToken(
  token: string,
): Promise<{ session: Session; user: User } | { session: null; user: null }> {
  const sessionId = sha.sha256.hash(token) as SessionId

  const session = await findSessionById(sessionId)

  if (!session) return { session: null, user: null }

  if (Date.now() >= session.expiresAt.getTime()) {
    await deleteSession(sessionId)

    return { session: null, user: null }
  }

  // If the session is expiring before the halfway point, refresh it
  if (
    Date.now() >=
    subDays(session.expiresAt, SESSION_LENGTH_IN_DAYS / 2).getTime()
  ) {
    await updateSession(sessionId, {
      expiresAt: addDays(new Date(), SESSION_LENGTH_IN_DAYS),
    })
  }

  return { session, user: session.user }
}

async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()

  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
}

async function setSessionToken(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    expires: expiresAt,
    path: "/",
  })
}

async function deleteSessionToken(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 0,
    path: "/",
  })
}

export async function setSession(userId: UserId, request?: Request) {
  const token = generateSessionToken()
  const ipAddress = await getIpAddress(request)
  const geolocation = await getGeolocation(request)

  const session = await createSession(token, userId, {
    ipAddress,
    country: geolocation?.country,
    region: geolocation?.region,
    city: geolocation?.city,
  })

  await setSessionToken(token, session.expiresAt)
}

export async function invalidateSession(sessionId: SessionId): Promise<void> {
  await deleteSessionToken()
  await deleteSession(sessionId)
}

export async function invalidateUserSessions(userId: UserId): Promise<void> {
  await deleteSessionToken()
  await deleteUserSessions(userId)
}

export const validateRequest = cache(
  async (): Promise<
    { user: User; session: Session } | { user: null; session: null }
  > => {
    const sessionId = await getSessionToken()

    if (!sessionId) {
      return { user: null, session: null }
    }

    const result = await validateSessionToken(sessionId)

    return result
  },
)

type AuthenticatedNextRequest<T extends NextRequest> = T & {
  user: User
  session: Session
}
type ProtectedRouteHandler<T extends NextRequest = NextRequest> = (
  request: AuthenticatedNextRequest<T>,
  { params }: { params?: Promise<Record<string, string>> },
) => Promise<Response> | Promise<NextResponse> | NextResponse | Response

export function protectedRoute<T extends NextRequest = NextRequest>(
  handler: ProtectedRouteHandler<T>,
) {
  return async (
    request: T,
    args: { params?: Promise<Record<string, string>> },
  ) => {
    const { user, session } = await validateRequest()

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED },
      )
    }

    const modifiedRequest = request as AuthenticatedNextRequest<T>
    modifiedRequest.user = user
    modifiedRequest.session = session

    return handler(modifiedRequest, args)
  }
}
