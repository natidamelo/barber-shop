const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [255, 'Item name cannot exceed 255 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required'],
    index: true
  },
  sku: {
    type: String,
    trim: true,
    sparse: true, // Allow multiple null values
    maxlength: [100, 'SKU cannot exceed 100 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand cannot exceed 100 characters']
  },
  cost_price: {
    type: Number,
    min: [0, 'Cost price cannot be negative'],
    set: val => val ? Math.round(val * 100) / 100 : val
  },
  selling_price: {
    type: Number,
    min: [0, 'Selling price cannot be negative'],
    set: val => val ? Math.round(val * 100) / 100 : val
  },
  current_stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  minimum_stock: {
    type: Number,
    default: 0,
    min: [0, 'Minimum stock cannot be negative']
  },
  maximum_stock: {
    type: Number,
    default: 1000,
    min: [1, 'Maximum stock must be at least 1']
  },
  unit: {
    type: String,
    default: 'piece',
    maxlength: [50, 'Unit cannot exceed 50 characters']
  },
  expiry_date: {
    type: Date,
    default: null
  },
  supplier: {
    type: String,
    trim: true,
    maxlength: [255, 'Supplier cannot exceed 255 characters']
  },
  supplier_contact: {
    type: String,
    trim: true,
    maxlength: [255, 'Supplier contact cannot exceed 255 characters']
  },
  image_url: {
    type: String,
    maxlength: [500, 'Image URL cannot exceed 500 characters'],
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
inventorySchema.index({ name: 1 });
inventorySchema.index({ sku: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ current_stock: 1 });
inventorySchema.index({ minimum_stock: 1 });
inventorySchema.index({ is_active: 1 });

// Virtual for stock status
inventorySchema.virtual('stock_status').get(function() {
  if (this.current_stock <= 0) return 'out_of_stock';
  if (this.current_stock <= this.minimum_stock) return 'low_stock';
  if (this.current_stock >= this.maximum_stock) return 'overstock';
  return 'in_stock';
});

// Virtual for formatted cost price
inventorySchema.virtual('formatted_cost_price').get(function() {
  return this.cost_price ? `$${this.cost_price.toFixed(2)}` : null;
});

// Virtual for formatted selling price
inventorySchema.virtual('formatted_selling_price').get(function() {
  return this.selling_price ? `$${this.selling_price.toFixed(2)}` : null;
});

// Static method to find low stock items
inventorySchema.statics.findLowStock = function(adminId = null) {
  const query = {
    is_active: true,
    $expr: { $lte: ['$current_stock', '$minimum_stock'] }
  };
  
  if (adminId) {
    query.admin_id = adminId;
  }
  
  return this.find(query).sort({ current_stock: 1 });
};

// Static method to find by category
inventorySchema.statics.findByCategory = function(category, adminId = null) {
  const query = {
    category: new RegExp(category, 'i'),
    is_active: true
  };
  
  if (adminId) {
    query.admin_id = adminId;
  }
  
  return this.find(query).sort({ name: 1 });
};

module.exports = mongoose.model('Inventory', inventorySchema);