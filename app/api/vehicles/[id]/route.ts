import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import mongoose from "mongoose";

// GET single vehicle
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const vehicle = await Vehicle.findById(id).populate(
      "employeeId",
      "name type"
    );

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT update vehicle

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Prepare update data with all fields
    const updateData: any = {
      number: body.number,
      name: body.name,
      employeeId: body.employeeId === null || body.employeeId === "unassigned" ? null : body.employeeId,
    };

    // Add optional fields if provided
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.vehicleAmount !== undefined) updateData.vehicleAmount = body.vehicleAmount;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.contractExpiry !== undefined) updateData.contractExpiry = body.contractExpiry;
    if (body.description !== undefined) updateData.description = body.description;

    const vehicle = await Vehicle.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      strict: false, // Allow fields not in schema (shouldn't be needed but helps with updates)
    }).populate("employeeId", "name type");

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Vehicle with this number already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// DELETE vehicle

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const vehicle = await Vehicle.findByIdAndDelete(id);

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {},
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
