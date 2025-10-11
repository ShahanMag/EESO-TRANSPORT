import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import Payment from "@/models/Payment";

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
      // Escape special regex characters but preserve Unicode (Arabic)
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Also try without spaces for flexible Arabic matching
      const searchNoSpaces = search.replace(/\s+/g, '');
      const escapedSearchNoSpaces = searchNoSpaces.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      query.$or = [
        { number: { $regex: escapedSearch, $options: "i" } },
        { name: { $regex: escapedSearch, $options: "i" } },
        // Add space-insensitive variants
        { number: { $regex: escapedSearchNoSpaces, $options: "i" } },
        { name: { $regex: escapedSearchNoSpaces, $options: "i" } },
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

    // If vehicleAmount is provided, create a payment record
    if (body.vehicleAmount && body.vehicleAmount > 0) {
      await Payment.create({
        vehicleId: vehicle._id,
        totalAmount: body.vehicleAmount,
        date: body.startDate || new Date(),
        remarks: "Initial vehicle contract payment",
      });
    }

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
