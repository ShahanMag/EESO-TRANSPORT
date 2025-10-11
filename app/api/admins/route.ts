import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Admin from "@/models/Admin";

export const dynamic = "force-dynamic";

// GET all admins
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: admins,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create new admin
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: body.username });
    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: "Username already exists" },
        { status: 400 }
      );
    }

    const admin = await Admin.create(body);

    // Return admin without password
    const adminData = {
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: adminData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
