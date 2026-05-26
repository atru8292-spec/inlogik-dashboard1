import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASS;

  // Если переменные не заданы — пропускаем без авторизации
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (!auth) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Inlogik Dashboard"' },
    });
  }

  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic" || !encoded) {
    return new NextResponse("Bad auth", { status: 401 });
  }

  const decoded = Buffer.from(encoded, "base64").toString();
  const [u, p] = decoded.split(":");
  if (u !== user || p !== pass) {
    return new NextResponse("Invalid creds", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Inlogik Dashboard"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
