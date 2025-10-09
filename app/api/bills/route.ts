import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";

// GET all bills
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: any = {};

    if (type && (type === "income" || type === "expense")) {
      query.type = type;
    }

    if (employeeId) {
      query.employeeId = employeeId;
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

    const bills = await Bill.find(query)
      .populate("employeeId", "name type")
      .sort({ date: -1 });

    return NextResponse.json({
      success: true,
      data: bills,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create new bill

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    // Validate paidAmount <= totalAmount
    if (body.paidAmount > body.totalAmount) {
      return NextResponse.json(
        { success: false, error: "Paid amount cannot exceed total amount" },
        { status: 400 }
      );
    }

    const bill = await Bill.create(body);

    // Populate employee data
    await bill.populate("employeeId", "name type");

    return NextResponse.json(
      {
        success: true,
        data: bill,
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
