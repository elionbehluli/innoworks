/// <reference types="deno" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"
import { logGmailRequest } from "./gmail-request-log.ts"

type SupabaseClient = ReturnType<typeof createClient>

const TOKEN_ID = "gmail_token"
const SAFETY_BUFFER_MS = 5 * 60 * 1000

type GmailTokenRow = {
  access_token: string
  expires_at: string
}

export type GmailApiError = {
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

export function isGmailUnauthenticatedError(data: unknown): boolean {
  const err = (data as GmailApiError)?.error
  return err?.code === 401 && err?.status === "UNAUTHENTICATED"
}

function isTokenValid(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() - SAFETY_BUFFER_MS > Date.now()
}

async function refreshAccessToken(supabase: SupabaseClient): Promise<string> {
  const tokenRequestBody = {
    client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN")!,
    grant_type: "refresh_token",
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(tokenRequestBody),
  })

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token as string | undefined

  if (!accessToken) {
    throw new Error(
      `Google token refresh failed: ${JSON.stringify({
        response: tokenData,
        requestBody: tokenRequestBody,
      })}. clientId: ${Deno.env.get("GOOGLE_CLIENT_ID")!}, clientSecret: ${Deno.env.get("GOOGLE_CLIENT_SECRET")!}, refreshToken: ${Deno.env.get("GMAIL_REFRESH_TOKEN")!}`
    )
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

  console.log("Gmail access token refreshed and saved.")
  return accessToken
}

export async function getGmailAccessToken(
  supabase: SupabaseClient,
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
      console.log("Using cached Gmail access token.")
      return token.access_token
    }
  }

  console.log("No valid Gmail token found. Requesting a new one...")
  return await refreshAccessToken(supabase)
}

export async function ensureGmailAccessToken(
  supabase: SupabaseClient
): Promise<string> {
  return await getGmailAccessToken(supabase)
}

export async function gmailFetch(
  supabase: SupabaseClient,
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
  let response = await fetch(url, { ...init, headers })
  await logRequest(response, headers)

  if (response.status === 401) {
    const errorBody = await response.clone().json().catch(() => null)
    if (isGmailUnauthenticatedError(errorBody)) {
      console.log("Gmail API returned 401 UNAUTHENTICATED. Refreshing token...")
      accessToken = await getGmailAccessToken(supabase, { forceRefresh: true })
      headers = new Headers(init.headers)
      headers.set("Authorization", `Bearer ${accessToken}`)
      response = await fetch(url, { ...init, headers })
      await logRequest(response, headers)
    }
  }

  return response
}
