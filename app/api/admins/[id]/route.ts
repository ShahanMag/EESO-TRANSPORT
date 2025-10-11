import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Admin from "@/models/Admin";

export const dynamic = "force-dynamic";

// PUT update admin
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const body = await request.json();
    const { id } = params;

    // Check if admin exists
    const existingAdmin = await Admin.findById(id);
    if (!existingAdmin) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }

    // If username is being changed, check if it's already taken
    if (body.username && body.username !== existingAdmin.username) {
      const duplicateAdmin = await Admin.findOne({ username: body.username });
      if (duplicateAdmin) {
        return NextResponse.json(
          { success: false, error: "Username already exists" },
          { status: 400 }
        );
      }
    }

    // Update fields
    if (body.username) existingAdmin.username = body.username;
    if (body.role) existingAdmin.role = body.role;

    // Only update password if provided
    if (body.password && body.password.length >= 8) {
      existingAdmin.password = body.password;
    }

    await existingAdmin.save();

    // Return admin without password
    const adminData = {
      _id: existingAdmin._id,
      username: existingAdmin.username,
      role: existingAdmin.role,
      createdAt: existingAdmin.createdAt,
      updatedAt: existingAdmin.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: adminData,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// DELETE admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = params;

    // Check if admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }

    // Prevent deleting the last admin
    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      return NextResponse.json(
        { success: false, error: "Cannot delete the last admin account" },
        { status: 400 }
      );
    }

    await Admin.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
        message: "Admin deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
