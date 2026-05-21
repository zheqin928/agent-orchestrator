import { NextResponse } from "next/server";
import { buildSessionCookie, getAuthPassword, issueSessionCookieValue } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface LoginBody {
  password?: unknown;
}

function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  return new URL(req.url).protocol === "https:";
}

export async function POST(request: Request) {
  const password = getAuthPassword();
  if (!password) {
    return NextResponse.json({ ok: true, authEnabled: false });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }

  if (body.password !== password) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const cookieValue = await issueSessionCookieValue(password);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildSessionCookie(cookieValue, isSecureRequest(request)));
  return response;
}
