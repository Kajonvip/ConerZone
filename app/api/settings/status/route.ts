import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const providerConfigured = Boolean(
    process.env.AI_PROVIDER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY
  );
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
  const endpointConfigured = Boolean(process.env.AI_API_ENDPOINT);

  // Only return booleans. Never send secret values to the browser.
  return NextResponse.json(
    { checked: true, providerConfigured, googleConfigured, endpointConfigured },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
