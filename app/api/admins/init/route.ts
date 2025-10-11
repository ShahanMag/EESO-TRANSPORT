import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Admin from "@/models/Admin";

export const dynamic = "force-dynamic";

// POST initialize default admin accounts
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const existingAdmins = await Admin.countDocuments();

    if (existingAdmins > 0) {
      return NextResponse.json(
        { success: false, error: "Admin accounts already initialized" },
        { status: 400 }
      );
    }

    // Create admin account
    const admin = await Admin.create({
      username: "admin",
      password: "12345678",
      role: "admin",
    });

    // Create super admin account
    const superAdmin = await Admin.create({
      username: "superadmin",
      password: "12345678",
      role: "super_admin",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Default admin accounts created successfully",
        data: {
          admin: { username: admin.username, role: admin.role },
          superAdmin: { username: superAdmin.username, role: superAdmin.role },
        },
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
