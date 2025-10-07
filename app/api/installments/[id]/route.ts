import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Installment from "@/models/Installment";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const body = await request.json();
    const installment = await Installment.findByIdAndUpdate(params.id, body, {
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
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const installment = await Installment.findByIdAndDelete(params.id);

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
