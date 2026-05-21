import { NextResponse } from "next/server";
import { buildClearCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  return new URL(req.url).protocol === "https:";
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildClearCookie(isSecureRequest(request)));
  return response;
}
