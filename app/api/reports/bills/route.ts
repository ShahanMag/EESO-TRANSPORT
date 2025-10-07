import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";

// GET Bills Report - filter by type/agent/date, show income vs expense summary
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
      .lean();

    // Calculate summary
    const summary = bills.reduce(
      (acc, bill) => {
        if (bill.type === "income") {
          acc.totalIncome += bill.totalAmount;
          acc.paidIncome += bill.paidAmount;
          acc.duesIncome += bill.totalAmount - bill.paidAmount;
        } else {
          acc.totalExpense += bill.totalAmount;
          acc.paidExpense += bill.paidAmount;
          acc.duesExpense += bill.totalAmount - bill.paidAmount;
        }
        return acc;
      },
      {
        totalIncome: 0,
        paidIncome: 0,
        duesIncome: 0,
        totalExpense: 0,
        paidExpense: 0,
        duesExpense: 0,
        netTotal: 0,
        netPaid: 0,
        netDues: 0,
      }
    );

    // Calculate net
    summary.netTotal = summary.totalIncome - summary.totalExpense;
    summary.netPaid = summary.paidIncome - summary.paidExpense;
    summary.netDues = summary.duesIncome - summary.duesExpense;

    return NextResponse.json({
      success: true,
      data: {
        bills,
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
