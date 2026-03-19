const mongoose = require('mongoose');

const operatingExpenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
    set: val => Math.round(val * 100) / 100
  },
  expense_date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
operatingExpenseSchema.index({ expense_date: 1 });
operatingExpenseSchema.index({ category: 1 });
operatingExpenseSchema.index({ created_by: 1 });

module.exports = mongoose.model('OperatingExpense', operatingExpenseSchema);
