import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Employee from "@/models/Employee";

// GET all employees
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const type = searchParams.get("type");

    let query: any = {};

    if (search) {
      // Escape special regex characters but preserve Unicode (Arabic)
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Also try without spaces for flexible matching
      const searchNoSpaces = search.replace(/\s+/g, '');
      const escapedSearchNoSpaces = searchNoSpaces.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      query.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { iqamaId: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
        // Add space-insensitive variants
        { name: { $regex: escapedSearchNoSpaces, $options: "i" } },
        { iqamaId: { $regex: escapedSearchNoSpaces, $options: "i" } },
        { phone: { $regex: escapedSearchNoSpaces, $options: "i" } },
      ];
    }

    if (type && (type === "driver" || type === "agent")) {
      query.type = type;
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: employees,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create new employee

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const employee = await Employee.create(body);

    return NextResponse.json(
      {
        success: true,
        data: employee,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Employee with this Iqama ID already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
