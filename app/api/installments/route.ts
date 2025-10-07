import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Installment from "@/models/Installment";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get("paymentId");

    let query = {};
    if (paymentId) {
      query = { paymentId };
    }

    const installments = await Installment.find(query).sort({ date: -1 });

    return NextResponse.json({
      success: true,
      data: installments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const installment = await Installment.create(body);

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
