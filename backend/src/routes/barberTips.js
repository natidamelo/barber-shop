const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const mongoose = require('mongoose');
const { BarberTip, User, Appointment } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Points per 10 ETB spent
const POINTS_PER_10_ETB = 1;

// @desc    Give points to barber (tip)
// @route   POST /api/barber-tips
// @access  Private (Customer)
router.post('/', protect, authorize('customer'), [
  body('barber_id').isMongoId().withMessage('Barber ID must be valid'),
  body('points').isInt({ min: 1 }).withMessage('Points must be at least 1'),
  body('appointment_id').optional().isMongoId().withMessage('Appointment ID must be valid'),
  body('message').optional().trim().isLength({ max: 200 }).withMessage('Message cannot exceed 200 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { barber_id, points, appointment_id, message } = req.body;
    const customerId = req.user._id || req.user.id;

    const barber = await User.findOne({ 
      _id: barber_id, 
      role: 'barber',
      ...(req.shop_id && { admin_id: req.shop_id })
    });
    if (!barber) {
      return res.status(400).json({ success: false, error: 'Invalid barber at your shop' });
    }

    // Get customer's total spent (paid appointments) in this shop
    const customerSpent = await Appointment.aggregate([
      { $match: { 
        customer_id: new mongoose.Types.ObjectId(customerId), 
        payment_status: 'paid',
        ...(req.shop_id && { admin_id: new mongoose.Types.ObjectId(req.shop_id) })
      } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$price', 0] } } } }
    ]);
    const totalSpent = customerSpent[0]?.total || 0;
    const earnedPoints = Math.floor(totalSpent / 10) * POINTS_PER_10_ETB;

    // Get points already given by this customer in this shop
    const pointsGiven = await BarberTip.aggregate([
      { $match: { 
        customer_id: new mongoose.Types.ObjectId(customerId),
        ...(req.shop_id && { admin_id: new mongoose.Types.ObjectId(req.shop_id) })
      } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    const totalGiven = pointsGiven[0]?.total || 0;
    const availablePoints = Math.max(0, earnedPoints - totalGiven);

    if (points > availablePoints) {
      return res.status(400).json({
        success: false,
        error: `Insufficient points. You have ${availablePoints} points available (earned from spending ${totalSpent.toFixed(0)} ETB).`
      });
    }

    // If appointment_id provided, verify it's a completed appointment with this barber in this shop
    if (appointment_id) {
      const apt = await Appointment.findOne({
        _id: appointment_id,
        customer_id: customerId,
        barber_id,
        status: 'completed',
        ...(req.shop_id && { admin_id: req.shop_id })
      });
      if (!apt) {
        return res.status(400).json({ success: false, error: 'Invalid or incomplete appointment' });
      }
    }

    const tip = await BarberTip.create({
      customer_id: customerId,
      barber_id,
      appointment_id: appointment_id || null,
      admin_id: req.shop_id, // Linked to this shop
      points,
      message: message?.trim() || ''
    });

    res.status(201).json({
      success: true,
      data: {
        id: tip._id,
        barber_id,
        points,
        message: tip.message,
        created_at: tip.createdAt
      },
      remaining_points: availablePoints - points
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get barber tips (for barber)
// @route   GET /api/barber-tips?barber_id=xxx
// @access  Private
router.get('/', protect, [
  query('barber_id').optional().isMongoId().withMessage('Barber ID must be valid')
], async (req, res, next) => {
  try {
    const { barber_id, page = 1, limit = 20 } = req.query;

    let query = {};
    if (req.shop_id) {
       query.admin_id = req.shop_id;
    }
    
    if (req.user.role === 'barber') {
      query.barber_id = req.user._id || req.user.id;
    } else if (barber_id && (req.user.role === 'admin' || req.user.role === 'receptionist')) {
      query.barber_id = barber_id;
    } else if (!query.barber_id) {
      return res.status(400).json({ success: false, error: 'barber_id required' });
    }

    const tips = await BarberTip.find(query)
      .populate('customer_id', 'first_name last_name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await BarberTip.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tips.length,
      total,
      data: tips.map(t => ({
        ...t,
        id: t._id,
        customer_name: t.customer_id ? `${t.customer_id.first_name} ${t.customer_id.last_name}` : 'Unknown'
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
