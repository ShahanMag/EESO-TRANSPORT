import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { serialize } from "cookie";

export const dynamic = "force-dynamic";

// POST login
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find admin by username
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Create session data
    const sessionData = {
      id: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    };

    // Set cookie with session
    const cookie = serialize("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          username: admin.username,
          role: admin.role,
        },
      },
      { status: 200 }
    );

    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
