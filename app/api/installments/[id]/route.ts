import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Installment from "@/models/Installment";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const body = await request.json();
    const installment = await Installment.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!installment) {
      return NextResponse.json(
        { success: false, error: "Installment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: installment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const installment = await Installment.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });

    if (!installment) {
      return NextResponse.json(
        { success: false, error: "Installment not found" },
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
