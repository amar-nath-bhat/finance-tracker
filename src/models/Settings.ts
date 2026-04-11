import mongoose, { Schema, model, models } from 'mongoose';

const SettingsSchema = new Schema({
  startingBalance: { type: Number, default: 0 },
  categories: { type: [String], default: ['Salary', 'Food', 'Rent', 'Utilities', 'Entertainment', 'Transport'] },
  subCategories: { type: Schema.Types.Mixed, default: {} }
});

// Clear cache to prevent hot reload from using an outdated schema with old enums
delete mongoose.models.Settings;

export const Settings = model('Settings', SettingsSchema);
