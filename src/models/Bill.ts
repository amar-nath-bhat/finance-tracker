import mongoose, { Schema, model, models } from 'mongoose';

const BillSchema = new Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  subCategory: { type: String },
  paymentMethod: { type: String, enum: ['UPI', 'Cash', 'CC'], default: 'UPI' },
  deadlineDay: { type: Number, required: true, min: 1, max: 31 },
  frequency: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'ANNUALLY'], default: 'MONTHLY' },
  paidPeriods: { type: [String], default: [] }
});

// Clear cache to prevent hot reload from using an outdated schema with old enums
delete mongoose.models.Bill;

export const Bill = model('Bill', BillSchema);
