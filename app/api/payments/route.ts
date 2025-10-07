import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";

// GET all payments
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const vehicleId = searchParams.get("vehicleId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: any = {};

    if (vehicleId) {
      query.vehicleId = vehicleId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const payments = await Payment.find(query)
      .populate({
        path: "vehicleId",
        select: "number name employeeId",
        populate: {
          path: "employeeId",
          select: "name type",
        },
      })
      .sort({ date: -1 });

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create new payment

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const payment = await Payment.create(body);

    // Populate vehicle and employee data
    await payment.populate({
      path: "vehicleId",
      select: "number name employeeId",
      populate: {
        path: "employeeId",
        select: "name type",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: payment,
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
