import { NextResponse } from "next/server";
import { authenticate, authenticationRequiredResponse, forbiddenResponse } from "./lib/auth.js";
import { authorize } from "./lib/authorization.js";

export function proxy(request) {
  const user = authenticate(request);
  if (!user) return authenticationRequiredResponse();
  if (!authorize(user, "admin:page")) return forbiddenResponse();
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
