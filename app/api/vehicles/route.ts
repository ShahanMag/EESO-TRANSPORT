import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";

// GET all vehicles
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const employeeId = searchParams.get("employeeId");

    let query: any = {};

    if (search) {
      query.$or = [
        { number: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const vehicles = await Vehicle.find(query)
      .populate("employeeId", "name type")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: vehicles,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create new vehicle

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const vehicle = await Vehicle.create(body);

    // Populate employee data
    await vehicle.populate("employeeId", "name type");

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
      },
      { status: 201 }
    );
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
