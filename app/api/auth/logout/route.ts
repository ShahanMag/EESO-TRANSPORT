import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

export const dynamic = "force-dynamic";

// POST logout
export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    const cookie = serialize("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 }
    );

    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
