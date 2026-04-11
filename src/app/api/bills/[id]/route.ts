import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Bill } from "@/models/Bill";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    
    // Ensure we don't overwrite id by mistake
    const updateData = { ...body };
    delete updateData._id;

    const bill = await Bill.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update bill" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    
    const bill = await Bill.findByIdAndDelete(id);
    
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Bill deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
  }
}
