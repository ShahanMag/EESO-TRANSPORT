import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import Payment from "@/models/Payment";
import Installment from "@/models/Installment";

// GET Vehicle Report - list with full details and payments by month
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: any = {};

    // If date range is provided, filter vehicles created in that range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const vehicles = await Vehicle.find(query)
      .populate("employeeId", "name type iqamaId phone")
      .lean();

    // For each vehicle, fetch payments and group by month
    const vehiclesWithPayments = await Promise.all(
      vehicles.map(async (vehicle) => {
        const payments = await Payment.find({ vehicleId: vehicle._id }).lean();

        // Fetch installments for each payment
        const paymentsWithInstallments = await Promise.all(
          payments.map(async (payment) => {
            const installments = await Installment.find({ paymentId: payment._id }).lean();
            const paidAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);

            return {
              ...payment,
              paidAmount,
              dues: payment.totalAmount - paidAmount,
            };
          })
        );

        // Group payments by month
        const paymentsByMonth: Record<string, { totalAmount: number; paidAmount: number; dues: number }> = {};

        paymentsWithInstallments.forEach((payment) => {
          const date = new Date(payment.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!paymentsByMonth[monthKey]) {
            paymentsByMonth[monthKey] = { totalAmount: 0, paidAmount: 0, dues: 0 };
          }

          paymentsByMonth[monthKey].totalAmount += payment.totalAmount;
          paymentsByMonth[monthKey].paidAmount += payment.paidAmount;
          paymentsByMonth[monthKey].dues += payment.dues;
        });

        return {
          ...vehicle,
          paymentsByMonth,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: vehiclesWithPayments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
