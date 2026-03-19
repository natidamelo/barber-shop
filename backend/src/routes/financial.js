const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const { OperatingExpense, Appointment, InventoryTransaction } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get financial summary report
// @route   GET /api/financial/summary
// @access  Private (Admin)
router.get('/summary', protect, authorize('admin'), [
  query('start_date').optional().isISO8601().withMessage('Start date must be in ISO format'),
  query('end_date').optional().isISO8601().withMessage('End date must be in ISO format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { start_date, end_date } = req.query;
    
    // Default to last 30 days if no dates provided
    let startDate, endDate;
    if (start_date && end_date) {
      startDate = moment(start_date).startOf('day').toDate();
      endDate = moment(end_date).endOf('day').toDate();
    } else {
      endDate = moment().endOf('day').toDate();
      startDate = moment().subtract(30, 'days').startOf('day').toDate();
    }

    // Calculate Total Revenue from PAID appointments (real collected revenue)
    const paidAppointments = await Appointment.find({
      payment_status: 'paid',
      appointment_date: { $gte: startDate, $lte: endDate }
    });

    const totalRevenue = paidAppointments.reduce((sum, apt) => {
      return sum + (apt.price || 0);
    }, 0);

    // Calculate Cost of Goods Sold (COGS) from inventory usage/waste transactions
    const inventoryTransactions = await InventoryTransaction.find({
      transaction_type: { $in: ['usage', 'waste'] },
      transaction_date: { $gte: startDate, $lte: endDate }
    });

    const costOfGoodsSold = inventoryTransactions.reduce((sum, trans) => {
      return sum + (trans.total_cost || 0);
    }, 0);

    // Calculate Gross Profit
    const grossProfit = totalRevenue - costOfGoodsSold;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Calculate Operating Expenses
    const operatingExpenses = await OperatingExpense.find({
      expense_date: { $gte: startDate, $lte: endDate }
    });

    const totalOperatingExpenses = operatingExpenses.reduce((sum, exp) => {
      return sum + (exp.amount || 0);
    }, 0);

    // Calculate Net Profit
    const netProfit = grossProfit - totalOperatingExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate
        },
        revenue: {
          total_revenue: Math.round(totalRevenue * 100) / 100,
          cost_of_goods_sold: Math.round(costOfGoodsSold * 100) / 100,
          gross_profit: Math.round(grossProfit * 100) / 100,
          gross_margin: Math.round(grossMargin * 100) / 100
        },
        expenses: {
          operating_expenses: Math.round(totalOperatingExpenses * 100) / 100
        },
        profit: {
          net_profit: Math.round(netProfit * 100) / 100,
          net_margin: Math.round(netMargin * 100) / 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all operating expenses
// @route   GET /api/financial/expenses
// @access  Private (Admin)
router.get('/expenses', protect, authorize('admin'), [
  query('start_date').optional().isISO8601().withMessage('Start date must be in ISO format'),
  query('end_date').optional().isISO8601().withMessage('End date must be in ISO format'),
  query('category').optional().isString().withMessage('Category must be a string')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { start_date, end_date, category, page = 1, limit = 50 } = req.query;
    
    let query = {};

    if (start_date || end_date) {
      query.expense_date = {};
      if (start_date) {
        query.expense_date.$gte = moment(start_date).startOf('day').toDate();
      }
      if (end_date) {
        query.expense_date.$lte = moment(end_date).endOf('day').toDate();
      }
    }

    if (category) {
      query.category = new RegExp(category, 'i');
    }

    const skip = (page - 1) * limit;
    const expenses = await OperatingExpense.find(query)
      .populate('created_by', 'first_name last_name')
      .sort({ expense_date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await OperatingExpense.countDocuments(query);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total: parseInt(total),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: expenses
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new operating expense
// @route   POST /api/financial/expenses
// @access  Private (Admin)
router.post('/expenses', protect, authorize('admin'), [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('expense_date')
    .optional()
    .isISO8601()
    .withMessage('Expense date must be in ISO format'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { description, category, amount, expense_date, payment_method, notes } = req.body;

    const expense = await OperatingExpense.create({
      description,
      category,
      amount,
      expense_date: expense_date ? new Date(expense_date) : new Date(),
      payment_method: payment_method || 'cash',
      notes: notes || '',
      created_by: req.user._id || req.user.id
    });

    await expense.populate('created_by', 'first_name last_name');

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update operating expense
// @route   PUT /api/financial/expenses/:id
// @access  Private (Admin)
router.put('/expenses/:id', protect, authorize('admin'), [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('expense_date')
    .optional()
    .isISO8601()
    .withMessage('Expense date must be in ISO format'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const expense = await OperatingExpense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Operating expense not found'
      });
    }

    const updateData = {};
    const { description, category, amount, expense_date, payment_method, notes } = req.body;

    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (amount !== undefined) updateData.amount = amount;
    if (expense_date !== undefined) updateData.expense_date = new Date(expense_date);
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (notes !== undefined) updateData.notes = notes;

    const updatedExpense = await OperatingExpense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    await updatedExpense.populate('created_by', 'first_name last_name');

    res.status(200).json({
      success: true,
      data: updatedExpense
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete operating expense
// @route   DELETE /api/financial/expenses/:id
// @access  Private (Admin)
router.delete('/expenses/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const expense = await OperatingExpense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Operating expense not found'
      });
    }

    await OperatingExpense.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Operating expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
