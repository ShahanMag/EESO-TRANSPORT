import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Installment from "@/models/Installment";

// GET Payment Records Report - filter by vehicle/date, show totals and dues
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
      .lean();

    // For each payment, fetch installments and calculate paid amount
    const paymentsWithInstallments = await Promise.all(
      payments.map(async (payment: any) => {
        const installments = await Installment.find({ paymentId: payment._id }).lean();
        const paidAmount = installments.reduce((sum, inst: any) => sum + inst.amount, 0);
        return {
          ...payment,
          paidAmount,
          dues: payment.totalAmount - paidAmount,
        };
      })
    );

    // Calculate totals
    const summary = paymentsWithInstallments.reduce(
      (acc, payment) => {
        acc.totalAmount += payment.totalAmount;
        acc.totalPaid += payment.paidAmount;
        acc.totalDues += payment.dues;
        return acc;
      },
      { totalAmount: 0, totalPaid: 0, totalDues: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        payments: paymentsWithInstallments,
        summary,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
