import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Debt } from "@/models/Debt";
import { Transaction } from "@/models/Transaction";

export async function GET() {
  try {
    await connectDB();
    const debts = await Debt.find().sort({ date: -1 });
    return NextResponse.json(debts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch debts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const debt = await Debt.create(body);
    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create debt" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    // Allow updating transaction details when NOT settling yet, or just settling them
    const { id, isSettled } = body;
    // Extract update fields
    const updateData = { ...body };
    delete updateData.id;
    
    const debt = await Debt.findByIdAndUpdate(id, updateData, { new: true });
    
    // If it was just marked as settled, automatically create the transaction
    if (isSettled && debt) {
       await Transaction.create({
          type: debt.direction === 'OWED_TO_ME' ? 'CREDIT' : 'DEBIT',
          amount: debt.amount,
          category: debt.category || 'Reimbursement', // fallback
          subCategory: debt.subCategory || '',
          description: debt.description || `Settled debt with ${debt.personName}`,
          paymentMethod: debt.paymentMethod || 'UPI'
       });
    }
    
    return NextResponse.json(debt);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update debt" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'clear_settled') {
       await Debt.deleteMany({ isSettled: true });
       return NextResponse.json({ message: "Cleared all settled debts" });
    }

    if (id) {
       await Debt.findByIdAndDelete(id);
       return NextResponse.json({ message: "Debt deleted" });
    }

    return NextResponse.json({ error: "No parameters provided" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete debt" }, { status: 500 });
  }
}
