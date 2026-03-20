const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  inventory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Inventory ID is required']
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required']
  },
  transaction_type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['purchase', 'usage', 'adjustment', 'waste', 'return']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    validate: {
      validator: function(v) {
        return v !== 0;
      },
      message: 'Quantity cannot be zero'
    }
  },
  previous_stock: {
    type: Number,
    required: [true, 'Previous stock is required'],
    min: [0, 'Previous stock cannot be negative']
  },
  new_stock: {
    type: Number,
    required: [true, 'New stock is required'],
    min: [0, 'New stock cannot be negative']
  },
  unit_cost: {
    type: Number,
    min: [0, 'Unit cost cannot be negative'],
    set: val => val ? Math.round(val * 100) / 100 : val
  },
  total_cost: {
    type: Number,
    min: [0, 'Total cost cannot be negative'],
    set: val => val ? Math.round(val * 100) / 100 : val
  },
  reference_number: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference number cannot exceed 100 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  transaction_date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
inventoryTransactionSchema.index({ inventory_id: 1 });
inventoryTransactionSchema.index({ user_id: 1 });
inventoryTransactionSchema.index({ transaction_type: 1 });
inventoryTransactionSchema.index({ transaction_date: 1 });
inventoryTransactionSchema.index({ inventory_id: 1, transaction_date: -1 });

// Virtual for formatted unit cost
inventoryTransactionSchema.virtual('formatted_unit_cost').get(function() {
  return this.unit_cost ? `$${this.unit_cost.toFixed(2)}` : null;
});

// Virtual for formatted total cost
inventoryTransactionSchema.virtual('formatted_total_cost').get(function() {
  return this.total_cost ? `$${this.total_cost.toFixed(2)}` : null;
});

// Virtual for quantity change
inventoryTransactionSchema.virtual('quantity_change').get(function() {
  return this.new_stock - this.previous_stock;
});

// Pre-populate references
inventoryTransactionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'inventory_id',
    select: 'name sku unit'
  }).populate({
    path: 'user_id',
    select: 'first_name last_name email'
  });
  next();
});

// Static method to find transactions by inventory item
inventoryTransactionSchema.statics.findByInventory = function(inventoryId, limit = 10) {
  return this.find({ inventory_id: inventoryId })
    .sort({ transaction_date: -1 })
    .limit(limit);
};

// Static method to find transactions by date range
inventoryTransactionSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    transaction_date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ transaction_date: -1 });
};

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);