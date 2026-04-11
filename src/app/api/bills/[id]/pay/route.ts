import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Bill } from "@/models/Bill";
import { Transaction } from "@/models/Transaction";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    
    const { datePaid, targetPeriod, amount } = body;

    if (!datePaid || !targetPeriod) {
      return NextResponse.json({ error: "datePaid and targetPeriod are required" }, { status: 400 });
    }

    const bill = await Bill.findById(id);
    
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Don't add if it's already there
    if (!bill.paidPeriods.includes(targetPeriod)) {
       bill.paidPeriods.push(targetPeriod);
       await bill.save();
    }

    // Determine the actual amount paid
    const paidAmount = amount !== undefined && amount !== null ? Number(amount) : bill.amount;

    // Create the transaction
    await Transaction.create({
      type: 'DEBIT', 
      date: new Date(datePaid),
      category: bill.category,
      subCategory: bill.subCategory || '',
      description: `Paid Bill: ${bill.name} (for ${targetPeriod})`,
      amount: paidAmount,
      paymentMethod: bill.paymentMethod || 'UPI'
    });

    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark bill as paid" }, { status: 500 });
  }
}
