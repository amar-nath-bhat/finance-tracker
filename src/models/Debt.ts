import mongoose, { Schema, model, models } from 'mongoose';

const DebtSchema = new Schema({
  personName: { type: String, required: true },
  direction: { type: String, enum: ['OWED_TO_ME', 'OWED_BY_ME'], required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  category: { type: String },
  subCategory: { type: String },
  paymentMethod: { type: String, enum: ['UPI', 'Cash', 'CC'], default: 'UPI' },
  isSettled: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

// Clear cache to prevent hot reload from using an outdated schema with old enums
delete mongoose.models.Debt;

export const Debt = model('Debt', DebtSchema);
