import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const paymentMethod = url.searchParams.get('paymentMethod');
    
    const query = paymentMethod ? { paymentMethod } : {};
    
    const transactions = await Transaction.find(query).sort({ date: -1 });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const transaction = await Transaction.create(body);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if(!id) return NextResponse.json({error: "ID required"}, {status: 400});

    const body = await req.json();
    const transaction = await Transaction.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if(!id) return NextResponse.json({error: "ID required"}, {status: 400});

    await Transaction.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
