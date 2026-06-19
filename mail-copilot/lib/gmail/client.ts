import type { SupabaseClient } from "@supabase/supabase-js"

import { logGmailRequest } from "@/lib/gmail/request-log"
import type { Database } from "@/lib/utils/supabase/types"

type AdminClient = SupabaseClient<Database>

const TOKEN_ID = "gmail_token"
const SAFETY_BUFFER_MS = 5 * 60 * 1000

type GmailTokenRow = {
  access_token: string
  expires_at: string
}

type GmailApiError = {
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

function isGmailUnauthenticatedError(data: unknown): boolean {
  const err = (data as GmailApiError)?.error
  return err?.code === 401 && err?.status === "UNAUTHENTICATED"
}

function isTokenValid(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() - SAFETY_BUFFER_MS > Date.now()
}

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN"
    )
  }

  return { clientId, clientSecret, refreshToken }
}

async function refreshAccessToken(supabase: AdminClient): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getGoogleCredentials()

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token as string | undefined

  if (!accessToken) {
    throw new Error(`Google token refresh failed: ${JSON.stringify(tokenData)},  clientId: ${clientId}, clientSecret: ${clientSecret}, refreshToken: ${refreshToken}`)
  }

  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in as number) * 1000
  ).toISOString()

  const { error } = await supabase.from("gmail_token").upsert({
    id: TOKEN_ID,
    access_token: accessToken,
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(`Failed to cache Gmail token: ${error.message}`)
  }

  return accessToken
}

export async function getGmailAccessToken(
  supabase: AdminClient,
  options?: { forceRefresh?: boolean }
): Promise<string> {
  if (!options?.forceRefresh) {
    const { data } = await supabase
      .from("gmail_token")
      .select("access_token, expires_at")
      .eq("id", TOKEN_ID)
      .maybeSingle()

    const token = data as GmailTokenRow | null
    if (token?.access_token && isTokenValid(token.expires_at)) {
      return token.access_token
    }
  }

  return await refreshAccessToken(supabase)
}

export async function gmailFetch(
  supabase: AdminClient,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let accessToken = await getGmailAccessToken(supabase)
  const method = init.method ?? "GET"
  const requestBody =
    typeof init.body === "string"
      ? init.body
      : init.body
        ? String(init.body)
        : null

  const request = (token: string) => {
    const headers = new Headers(init.headers)
    headers.set("Authorization", `Bearer ${token}`)
    return fetch(url, { ...init, headers })
  }

  const logRequest = async (response: Response, headers: Headers) => {
    await logGmailRequest(supabase, {
      method,
      url,
      requestHeaders: headers,
      requestBody,
      response,
    })
  }

  let headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)
  let response = await request(accessToken)
  await logRequest(response, headers)

  if (response.status === 401) {
    const errorBody = await response.clone().json().catch(() => null)
    if (isGmailUnauthenticatedError(errorBody)) {
      accessToken = await getGmailAccessToken(supabase, { forceRefresh: true })
      headers = new Headers(init.headers)
      headers.set("Authorization", `Bearer ${accessToken}`)
      response = await request(accessToken)
      await logRequest(response, headers)
    }
  }

  return response
}
