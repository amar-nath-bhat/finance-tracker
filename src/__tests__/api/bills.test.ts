/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getBills, POST as createBill } from '@/app/api/bills/route';
import { PUT as updateBill, DELETE as deleteBill } from '@/app/api/bills/[id]/route';
import { POST as payBill } from '@/app/api/bills/[id]/pay/route';
import { Bill } from '@/models/Bill';
import { Transaction } from '@/models/Transaction';
import { setupDB } from '../setupEnv';

setupDB();

const mockUrl = 'http://localhost/api/bills';

describe('Bills API', () => {
  it('should create a new bill on POST', async () => {
    const payload = {
      name: 'Rent',
      amount: 1500,
      category: 'Housing',
      deadlineDay: 5,
      frequency: 'MONTHLY'
    };

    const req = new NextRequest(mockUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await createBill(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Rent');
    expect(data.amount).toBe(1500);
    expect(data._id).toBeDefined();

    const dbBill = await Bill.findById(data._id);
    expect(dbBill).toBeTruthy();
    expect(dbBill?.name).toBe('Rent');
  });

  it('should fetch bills on GET', async () => {
    await Bill.create({ name: 'Internet', amount: 50, category: 'Utilities', deadlineDay: 1 });
    
    const req = new NextRequest(mockUrl, { method: 'GET' });
    const res = await getBills();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].name).toBeDefined();
  });

  it('should update a bill on PUT', async () => {
    const doc = await Bill.create({ name: 'Old Rent', amount: 1000, category: 'Housing', deadlineDay: 5 });
    
    const payload = { amount: 1200 };
    const req = new NextRequest(`${mockUrl}/${doc._id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    const res = await updateBill(req, { params: Promise.resolve({ id: doc._id.toString() }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.amount).toBe(1200);
    
    const updatedDoc = await Bill.findById(doc._id);
    expect(updatedDoc?.amount).toBe(1200);
  });

  it('should delete a bill on DELETE', async () => {
    const doc = await Bill.create({ name: 'Temp Bill', amount: 100, category: 'Misc', deadlineDay: 1 });
    
    const req = new NextRequest(`${mockUrl}/${doc._id}`, { method: 'DELETE' });
    const res = await deleteBill(req, { params: Promise.resolve({ id: doc._id.toString() }) });
    expect(res.status).toBe(200);
    
    const deletedDoc = await Bill.findById(doc._id);
    expect(deletedDoc).toBeNull();
  });

  it('should mark a bill as paid and create corresponding transaction', async () => {
    const doc = await Bill.create({ name: 'Gym', amount: 50, category: 'Health', deadlineDay: 1 });
    
    const payload = {
      datePaid: new Date().toISOString(),
      targetPeriod: '2026-04',
      amount: 45 // Adjusting amount for this specific payment
    };

    const req = new NextRequest(`${mockUrl}/${doc._id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await payBill(req, { params: Promise.resolve({ id: doc._id.toString() }) });
    expect(res.status).toBe(200);
    
    const updatedDoc = await Bill.findById(doc._id);
    expect(updatedDoc?.paidPeriods).toContain('2026-04');

    // Make sure transaction was created
    const transaction = await Transaction.findOne({ description: `Paid Bill: Gym (for 2026-04)` });
    expect(transaction).toBeTruthy();
    expect(transaction?.amount).toBe(45);
    expect(transaction?.category).toBe('Health');
  });
});
