const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Inventory, InventoryTransaction, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private (Admin/Barber)
router.get('/', protect, authorize('admin', 'barber'), [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('low_stock').optional().isBoolean().withMessage('Low stock must be a boolean'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sort').optional().isIn(['name', 'current_stock', 'minimum_stock', 'cost_price', 'created_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { category, low_stock, search, sort = 'name', order = 'asc', page = 1, limit = 10 } = req.query;
    
    // ── Multi-Tenancy Filter ─────────────────────────────────────────────────
    let query = { is_active: true };
    if (req.shop_id) {
      query.admin_id = req.shop_id;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Apply filters
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sort]: sortOrder };

    // Apply pagination
    const skip = (page - 1) * limit;
    
    let inventory;
    let total;

    // Handle low stock filter separately using aggregation
    if (low_stock === 'true') {
      // Use aggregation pipeline for low stock with other filters
      const pipeline = [
        {
          $match: {
            ...query,
            $expr: { $lte: ['$current_stock', '$minimum_stock'] }
          }
        },
        { $sort: sortObj },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      ];

      const countPipeline = [
        {
          $match: {
            ...query,
            $expr: { $lte: ['$current_stock', '$minimum_stock'] }
          }
        },
        { $count: 'total' }
      ];

      const [inventoryResult, countResult] = await Promise.all([
        Inventory.aggregate(pipeline),
        Inventory.aggregate(countPipeline)
      ]);

      inventory = inventoryResult;
      total = countResult[0]?.total || 0;
    } else {
      inventory = await Inventory.find(query)
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      total = await Inventory.countDocuments(query);
    }

    res.status(200).json({
      success: true,
      count: inventory.length,
      total: parseInt(total),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: inventory
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get low stock items
// @route   GET /api/inventory/low-stock
// @access  Private (Admin/Barber)
router.get('/low-stock', protect, authorize('admin', 'barber'), async (req, res, next) => {
  try {
    const lowStockItems = await Inventory.findLowStock(req.shop_id);

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get inventory categories
// @route   GET /api/inventory/categories
// @access  Private (Admin/Barber)
router.get('/categories', protect, authorize('admin', 'barber'), async (req, res, next) => {
  try {
    const categories = await Inventory.distinct('category', {
      category: { $ne: null, $exists: true },
      is_active: true,
      ...(req.shop_id && { admin_id: req.shop_id })
    });

    const categoryList = categories.filter(cat => cat && cat.trim() !== '').sort();

    res.status(200).json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private (Admin/Barber)
router.get('/:id', protect, authorize('admin', 'barber'), [
  param('id').isMongoId().withMessage('Inventory ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const item = await Inventory.findOne({
      _id: req.params.id,
      ...(req.shop_id && { admin_id: req.shop_id })
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Get recent transactions
    const recentTransactions = await InventoryTransaction.find({ inventory_id: req.params.id })
      .populate('user_id', 'first_name last_name')
      .sort({ transaction_date: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...item,
        recent_transactions: recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Item name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('SKU cannot exceed 100 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand cannot exceed 100 characters'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a valid positive number'),
  body('selling_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a valid positive number'),
  body('current_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a valid positive integer'),
  body('minimum_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a valid positive integer'),
  body('maximum_stock')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum stock must be a valid positive integer'),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Unit cannot exceed 50 characters'),
  body('expiry_date')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be in ISO format')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const {
      name, description, sku, category, brand, cost_price, selling_price,
      current_stock = 0, minimum_stock = 0, maximum_stock = 1000,
      unit = 'piece', expiry_date, supplier, supplier_contact,
      image_url, notes
    } = req.body;

    // Check if SKU already exists for this shop
    if (sku) {
      const existingItem = await Inventory.findOne({ 
        sku, 
        ...(req.shop_id && { admin_id: req.shop_id })
      });
      if (existingItem) {
        return res.status(400).json({
          success: false,
          error: 'Item with this SKU already exists'
        });
      }
    }

    const item = await Inventory.create({
      name,
      description,
      sku,
      category,
      brand,
      cost_price,
      selling_price,
      current_stock,
      minimum_stock,
      maximum_stock,
      unit,
      expiry_date,
      supplier,
      supplier_contact,
      image_url,
      notes,
      admin_id: req.shop_id // Linked to this shop
    });

    // Create initial transaction if stock > 0
    if (current_stock > 0) {
      await InventoryTransaction.create({
        inventory_id: item._id,
        user_id: req.user._id || req.user.id,
        admin_id: req.shop_id, // Linked to this shop
        transaction_type: 'purchase',
        quantity: current_stock,
        previous_stock: 0,
        new_stock: current_stock,
        unit_cost: cost_price,
        total_cost: cost_price ? cost_price * current_stock : null,
        notes: 'Initial stock',
        transaction_date: new Date()
      });
    }

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Inventory ID must be a valid MongoDB ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Item name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('SKU cannot exceed 100 characters'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a valid positive number'),
  body('selling_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a valid positive number'),
  body('current_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a valid positive integer'),
  body('minimum_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a valid positive integer'),
  body('maximum_stock')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum stock must be a valid positive integer'),
  body('current_stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a valid positive integer')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const item = await Inventory.findOne({
      _id: req.params.id,
      ...(req.shop_id && { admin_id: req.shop_id })
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    const updateData = {};
    const {
      name, description, sku, category, brand, cost_price, selling_price,
      current_stock, minimum_stock, maximum_stock, unit, expiry_date, supplier,
      supplier_contact, image_url, notes, is_active
    } = req.body;

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (brand !== undefined) updateData.brand = brand;
    if (cost_price !== undefined) updateData.cost_price = cost_price;
    if (selling_price !== undefined) updateData.selling_price = selling_price;
    if (current_stock !== undefined) updateData.current_stock = current_stock;
    if (minimum_stock !== undefined) updateData.minimum_stock = minimum_stock;
    if (maximum_stock !== undefined) updateData.maximum_stock = maximum_stock;
    if (unit !== undefined) updateData.unit = unit;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (supplier_contact !== undefined) updateData.supplier_contact = supplier_contact;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (sku !== undefined) {
      // Check if another item has this SKU
      const existingItem = await Inventory.findOne({ 
        sku, 
        _id: { $ne: req.params.id },
        ...(req.shop_id && { admin_id: req.shop_id })
      });
      
      if (existingItem) {
        return res.status(400).json({
          success: false,
          error: 'Item with this SKU already exists'
        });
      }
      updateData.sku = sku;
    }

    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Adjust inventory stock
// @route   POST /api/inventory/:id/adjust
// @access  Private (Admin/Barber)
router.post('/:id/adjust', protect, authorize('admin', 'barber'), [
  param('id').isMongoId().withMessage('Inventory ID must be a valid MongoDB ID'),
  body('quantity')
    .isInt()
    .withMessage('Quantity must be an integer'),
  body('transaction_type')
    .isIn(['purchase', 'usage', 'adjustment', 'waste', 'return'])
    .withMessage('Invalid transaction type'),
  body('unit_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a valid positive number'),
  body('reference_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference number cannot exceed 100 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { quantity, transaction_type, unit_cost, reference_number, notes } = req.body;
    
    const item = await Inventory.findOne({
      _id: req.params.id,
      ...(req.shop_id && { admin_id: req.shop_id })
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    const previousStock = item.current_stock;
    let newStock;

    // Calculate new stock based on transaction type
    switch (transaction_type) {
      case 'purchase':
      case 'return':
      case 'adjustment':
        newStock = previousStock + Math.abs(quantity);
        break;
      case 'usage':
      case 'waste':
        newStock = previousStock - Math.abs(quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid transaction type'
        });
    }

    // Ensure stock doesn't go negative
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock for this transaction'
      });
    }

    // Calculate actual quantity for transaction record
    const actualQuantity = transaction_type === 'usage' || transaction_type === 'waste' 
      ? -Math.abs(quantity) 
      : Math.abs(quantity);

    // Get user ID
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Update inventory stock
    await Inventory.findByIdAndUpdate(
      req.params.id,
      { current_stock: newStock },
      { new: true }
    );

    // Create transaction record
    const transactionData = {
      inventory_id: req.params.id,
      user_id: userId,
      admin_id: req.shop_id, // Linked to this shop
      transaction_type,
      quantity: actualQuantity,
      previous_stock: previousStock,
      new_stock: newStock,
      transaction_date: new Date()
    };

    // Calculate unit_cost and total_cost
    // For usage and waste transactions, use cost_price if unit_cost not provided
    const finalUnitCost = unit_cost !== undefined && unit_cost !== null 
      ? unit_cost 
      : (transaction_type === 'usage' || transaction_type === 'waste') && item.cost_price
        ? item.cost_price
        : null;

    if (finalUnitCost !== null && finalUnitCost !== undefined) {
      transactionData.unit_cost = finalUnitCost;
      transactionData.total_cost = finalUnitCost * Math.abs(quantity);
    }

    // Add optional fields only if they exist
    if (reference_number) {
      transactionData.reference_number = reference_number;
    }
    if (notes) {
      transactionData.notes = notes;
    }

    await InventoryTransaction.create(transactionData);

    const updatedItem = await Inventory.findById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Stock adjustment error:', error);
    next(error);
  }
});

// @desc    Get inventory transactions
// @route   GET /api/inventory/:id/transactions
// @access  Private (Admin/Barber)
router.get('/:id/transactions', protect, authorize('admin', 'barber'), [
  param('id').isMongoId().withMessage('Inventory ID must be a valid MongoDB ID'),
  query('type').optional().isIn(['purchase', 'usage', 'adjustment', 'waste', 'return']).withMessage('Invalid transaction type')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { type, page = 1, limit = 10 } = req.query;
    
    let query = { 
      inventory_id: req.params.id,
      ...(req.shop_id && { admin_id: req.shop_id })
    };

    if (type) {
      query.transaction_type = type;
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    const transactions = await InventoryTransaction.find(query)
      .populate('user_id', 'first_name last_name')
      .sort({ transaction_date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Get total count for pagination
    const total = await InventoryTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: parseInt(total),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: transactions
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Inventory ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const item = await Inventory.findOne({
      _id: req.params.id,
      ...(req.shop_id && { admin_id: req.shop_id })
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Delete transactions first (cascading)
    await InventoryTransaction.deleteMany({ inventory_id: req.params.id });
    
    // Delete inventory item
    await Inventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;