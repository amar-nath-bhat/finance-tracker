/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/transactions/route';
import { Transaction } from '@/models/Transaction';
import { setupDB } from '../setupEnv';

setupDB();

const mockUrl = 'http://localhost/api/transactions';

describe('Transactions API', () => {
  it('should create a new transaction on POST', async () => {
    const payload = {
      type: 'DEBIT',
      amount: 100,
      category: 'Food',
      paymentMethod: 'UPI'
    };

    const req = new NextRequest(mockUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.amount).toBe(100);
    expect(data.category).toBe('Food');
    expect(data._id).toBeDefined();

    const dbTransaction = await Transaction.findById(data._id);
    expect(dbTransaction).toBeTruthy();
  });

  it('should fetch transactions on GET', async () => {
    await Transaction.create({ type: 'CREDIT', amount: 500, category: 'Salary' });
    
    const req = new NextRequest(mockUrl, { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].amount).toBeDefined();
  });

  it('should fetch transactions by paymentMethod on GET', async () => {
    await Transaction.create({ type: 'DEBIT', amount: 50, category: 'Snacks', paymentMethod: 'Cash' });
    await Transaction.create({ type: 'DEBIT', amount: 200, category: 'Bills', paymentMethod: 'CC' });
    
    const req = new NextRequest(`${mockUrl}?paymentMethod=Cash`, { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.every((t: any) => t.paymentMethod === 'Cash')).toBe(true);
  });

  it('should update a transaction on PUT', async () => {
    const doc = await Transaction.create({ type: 'DEBIT', amount: 50, category: 'Snacks' });
    
    const payload = { amount: 75 };
    const req = new NextRequest(`${mockUrl}?id=${doc._id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.amount).toBe(75);
    
    const updatedDoc = await Transaction.findById(doc._id);
    expect(updatedDoc?.amount).toBe(75);
  });

  it('should delete a transaction on DELETE', async () => {
    const doc = await Transaction.create({ type: 'DEBIT', amount: 50, category: 'Snacks' });
    
    const req = new NextRequest(`${mockUrl}?id=${doc._id}`, { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    
    const deletedDoc = await Transaction.findById(doc._id);
    expect(deletedDoc).toBeNull();
  });

  it('should return error on POST with invalid data', async () => {
    const req = new NextRequest(mockUrl, {
      method: 'POST',
      body: JSON.stringify({ amount: 100 }) // missing required fields like type, category
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
