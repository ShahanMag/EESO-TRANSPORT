import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Vehicle from "@/models/Vehicle";
import mongoose from "mongoose";

// GET Employee Report - list with vehicle counts
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let employeeQuery: any = {};

    // If date range is provided, filter employees created in that range
    if (startDate || endDate) {
      employeeQuery.createdAt = {};
      if (startDate) {
        employeeQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        employeeQuery.createdAt.$lte = new Date(endDate);
      }
    }

    const employees = await Employee.find(employeeQuery).lean();

    // Get vehicle counts for each employee
    const employeeReport = await Promise.all(
      employees.map(async (employee) => {
        const vehicleCount = await Vehicle.countDocuments({
          employeeId: employee._id,
        });

        return {
          ...employee,
          vehicleCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: employeeReport,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
