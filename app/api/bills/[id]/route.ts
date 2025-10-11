import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// GET single bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid bill ID" },
        { status: 400 }
      );
    }

    const bill = await Bill.findById(id).populate(
      "employeeId",
      "name type"
    );

    if (!bill) {
      return NextResponse.json(
        { success: false, error: "Bill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT update bill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid bill ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate paidAmount <= totalAmount if both are provided
    if (body.paidAmount !== undefined && body.totalAmount !== undefined) {
      if (body.paidAmount > body.totalAmount) {
        return NextResponse.json(
          { success: false, error: "Paid amount cannot exceed total amount" },
          { status: 400 }
        );
      }
    } else if (body.paidAmount !== undefined || body.totalAmount !== undefined) {
      // If only one is being updated, get the current bill to check
      const currentBill = await Bill.findById(id);
      if (!currentBill) {
        return NextResponse.json(
          { success: false, error: "Bill not found" },
          { status: 404 }
        );
      }

      const newPaidAmount = body.paidAmount !== undefined ? body.paidAmount : currentBill.paidAmount;
      const newTotalAmount = body.totalAmount !== undefined ? body.totalAmount : currentBill.totalAmount;

      if (newPaidAmount > newTotalAmount) {
        return NextResponse.json(
          { success: false, error: "Paid amount cannot exceed total amount" },
          { status: 400 }
        );
      }
    }

    const bill = await Bill.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: false, // Disable built-in validator to avoid timing issues
    }).populate("employeeId", "name type");

    if (!bill) {
      return NextResponse.json(
        { success: false, error: "Bill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// DELETE bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid bill ID" },
        { status: 400 }
      );
    }

    const bill = await Bill.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: "Bill not found" },
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
