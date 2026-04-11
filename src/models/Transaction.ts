import mongoose, { Schema, model, models } from 'mongoose';

const TransactionSchema = new Schema({
  type: { 
    type: String, 
    enum: ['CREDIT', 'DEBIT', 'TRANSFER'], 
    required: true 
  },
  date: { type: Date, default: Date.now },
  category: { type: String, required: true },
  subCategory: { type: String },
  description: { type: String },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['UPI', 'Cash', 'CC'], default: 'UPI' },
  isFlagged: { type: Boolean, default: false }
});

// Clear cache to prevent hot reload from using an outdated schema with old enums
delete mongoose.models.Transaction;

export const Transaction = model('Transaction', TransactionSchema);