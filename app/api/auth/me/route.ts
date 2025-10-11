import { NextRequest, NextResponse } from "next/server";
import { parse } from "cookie";

export const dynamic = "force-dynamic";

// GET current user
export async function GET(request: NextRequest) {
  try {
    const cookies = parse(request.headers.get("cookie") || "");
    const sessionCookie = cookies.session;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const session = JSON.parse(sessionCookie);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: session.id,
          username: session.username,
          role: session.role,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Invalid session" },
      { status: 401 }
    );
  }
}
