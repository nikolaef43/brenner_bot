import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Never serve raw markdown files directly from `public/corpus/`.
  // Corpus documents should be accessed via `/corpus/[doc]` where we can enforce policy.
  if (pathname.startsWith("/corpus/") && pathname.endsWith(".md")) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/corpus/:path*"],
};

