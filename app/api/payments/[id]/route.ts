import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Installment from "@/models/Installment";
import mongoose from "mongoose";

// GET single payment
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
        { success: false, error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    const payment = await Payment.findById(id).populate({
      path: "vehicleId",
      select: "number name employeeId",
      populate: {
        path: "employeeId",
        select: "name type",
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT update payment

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const payment = await Payment.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate({
      path: "vehicleId",
      select: "number name employeeId",
      populate: {
        path: "employeeId",
        select: "name type",
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// DELETE payment

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    // Soft delete all associated installments first
    await Installment.updateMany(
      { paymentId: id },
      { isDeleted: true, deletedAt: new Date() }
    );

    const payment = await Payment.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
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
