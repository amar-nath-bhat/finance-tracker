import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Bill } from "@/models/Bill";

export async function GET() {
  try {
    await connectDB();
    const bills = await Bill.find().sort({ deadlineDay: 1 });
    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    
    // Basic server-side validation
    if (!body.name || !body.amount || !body.category || !body.deadlineDay) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bill = await Bill.create(body);
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
  }
}
