const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const mongoose = require('mongoose');
const moment = require('moment');
const { Appointment, User, Service, Inventory, InventoryTransaction } = require('../models');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper function to calculate commission
const calculateCommission = async (price, barberId, serviceId) => {
  try {
    // Get barber with commission percentage and role
    const barber = await User.findById(barberId).select('commission_percentage role');
    if (!barber || barber.role !== 'barber') {
      return { shop_cut: 0, barber_commission: 0 };
    }

    // Get service with shop_cut
    const service = await Service.findById(serviceId).select('shop_cut');
    if (!service) {
      return { shop_cut: 0, barber_commission: 0 };
    }

    // Calculate shop cut (fixed amount from service)
    const shopCut = service.shop_cut || 0;
    
    // Calculate remaining amount after shop cut
    const remainingAmount = Math.max(0, price - shopCut);
    
    // Calculate barber commission (percentage of remaining amount)
    const commissionPercentage = barber.commission_percentage || 0;
    const barberCommission = Math.round((remainingAmount * commissionPercentage / 100) * 100) / 100;

    return {
      shop_cut: Math.round(shopCut * 100) / 100,
      barber_commission: barberCommission
    };
  } catch (error) {
    console.error('Error calculating commission:', error);
    return { shop_cut: 0, barber_commission: 0 };
  }
};

// Helper function to create inventory transactions when appointment is completed
const createInventoryTransactionsForAppointment = async (appointment, userId) => {
  try {
    // Get service ID (handle both populated and non-populated)
    const serviceId = appointment.service_id?._id || appointment.service_id;
    if (!serviceId) {
      console.warn('Service ID not found for appointment:', appointment._id);
      return;
    }

    // Get the service to check for inventory requirements
    const service = await Service.findById(serviceId);
    if (!service) {
      console.warn('Service not found for appointment:', appointment._id);
      return;
    }

    // Check if service has inventory requirements defined
    let inventoryItems = [];
    
    if (service.requirements && service.requirements.inventory_items && Array.isArray(service.requirements.inventory_items)) {
      // Service has specific inventory items defined
      for (const itemReq of service.requirements.inventory_items) {
        const inventoryItem = await Inventory.findById(itemReq.inventory_id || itemReq.id);
        if (inventoryItem && inventoryItem.is_active !== false) {
          const quantity = itemReq.quantity || 1;
          inventoryItems.push({ item: inventoryItem, quantity });
        }
      }
    } else {
      // Default behavior: Use inventory items matching service category or general products
      // This is a fallback - ideally services should have inventory requirements configured
      let categoryMatch = [];
      
      if (service.category) {
        categoryMatch = await Inventory.find({ 
          category: new RegExp(service.category, 'i'), 
          is_active: { $ne: false },
          current_stock: { $gt: 0 }
        }).limit(3);
      }
      
      // If no category match, try to find general/commonly used items
      if (categoryMatch.length === 0) {
        const generalItems = await Inventory.find({
          is_active: { $ne: false },
          current_stock: { $gt: 0 },
          $or: [
            { category: { $in: ['Hair Products', 'Beard Products', 'General', 'Supplies', 'Hair Care', 'Beard Care'] } },
            { category: { $exists: false } }
          ]
        }).limit(2);
        inventoryItems = generalItems.map(item => ({ item, quantity: 1 }));
      } else {
        inventoryItems = categoryMatch.map(item => ({ item, quantity: 1 }));
      }
    }

    // Create inventory transactions for each item
    for (const { item, quantity } of inventoryItems) {
      // Check if we have enough stock
      if (item.current_stock < quantity) {
        console.warn(`Insufficient stock for ${item.name}. Required: ${quantity}, Available: ${item.current_stock}`);
        continue; // Skip this item if insufficient stock
      }

      const previousStock = item.current_stock;
      const newStock = previousStock - quantity;

      // Update inventory stock
      await Inventory.findByIdAndUpdate(
        item._id,
        { current_stock: newStock },
        { new: true }
      );

      // Calculate costs
      const unitCost = item.cost_price || 0;
      const totalCost = unitCost * quantity;

      // Create inventory transaction
      await InventoryTransaction.create({
        inventory_id: item._id,
        user_id: userId,
        admin_id: appointment.admin_id || req.shop_id,
        transaction_type: 'usage',
        quantity: -quantity, // Negative for usage
        previous_stock: previousStock,
        new_stock: newStock,
        unit_cost: unitCost,
        total_cost: totalCost,
        notes: `Auto-generated from completed appointment: ${service.name}`,
        transaction_date: new Date()
      });
    }

    if (inventoryItems.length > 0) {
      console.log(`Created ${inventoryItems.length} inventory transaction(s) for appointment ${appointment._id}`);
    }
  } catch (error) {
    // Log error but don't fail the appointment update
    console.error('Error creating inventory transactions for appointment:', error);
  }
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
router.get('/', protect, [
  query('date').optional().isISO8601().withMessage('Date must be in ISO format'),
  query('start_date').optional().isISO8601().withMessage('Start date must be in ISO format'),
  query('end_date').optional().isISO8601().withMessage('End date must be in ISO format'),
  query('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Invalid status'),
  query('barber_id').optional().isMongoId().withMessage('Barber ID must be a valid MongoDB ID'),
  query('customer_id').optional().isMongoId().withMessage('Customer ID must be a valid MongoDB ID')
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

    const { date, start_date, end_date, status, barber_id, customer_id, page = 1, limit = 10 } = req.query;
    
    let query = {};
    // ── Multi-Tenancy Filter ─────────────────────────────────────────────────
    if (req.shop_id) {
      query.admin_id = req.shop_id;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Role-based filtering within the shop
    if (req.user.role === 'customer') {
      query.customer_id = req.user._id || req.user.id;
    } else if (req.user.role === 'barber') {
      query.barber_id = req.user._id || req.user.id;
    }

    // Apply date filters
    if (date) {
      const startDate = moment(date).startOf('day').toDate();
      const endDate = moment(date).endOf('day').toDate();
      query.appointment_date = { $gte: startDate, $lte: endDate };
    } else if (start_date || end_date) {
      query.appointment_date = {};
      if (start_date) {
        const start = moment(start_date).startOf('day').toDate();
        query.appointment_date.$gte = start;
      }
      if (end_date) {
        const end = moment(end_date).endOf('day').toDate();
        query.appointment_date.$lte = end;
      }
    }

    if (status) {
      query.status = status;
    }

    if (barber_id && (req.user.role === 'admin' || req.user.role === 'receptionist' || req.user.role === 'barber')) {
      query.barber_id = barber_id;
    }

    // Only admin/receptionist may filter by customer_id; never override customer's own filter
    if (customer_id && (req.user.role === 'admin' || req.user.role === 'receptionist')) {
      query.customer_id = customer_id;
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    let appointments = await Appointment.find(query)
      .populate('customer_id', 'first_name last_name email phone')
      .populate('barber_id', 'first_name last_name email phone')
      .populate('service_id', 'name duration price category shop_cut')
      .sort({ appointment_date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Recalculate commission and fix payment_status for appointments
    for (let appointment of appointments) {
      // Fix payment_status if it doesn't match amount_paid
      const amountPaid = appointment.amount_paid || 0
      const price = appointment.price || 0
      
      if (price > 0) {
        let correctPaymentStatus
        if (amountPaid === 0) {
          correctPaymentStatus = 'pending'
        } else if (amountPaid >= price) {
          correctPaymentStatus = 'paid'
        } else {
          correctPaymentStatus = 'partially_paid'
        }
        
        // If payment_status is incorrect, fix it
        if (appointment.payment_status !== correctPaymentStatus && appointment.payment_status !== 'refunded') {
          appointment.payment_status = correctPaymentStatus
          
          // Save correction to database (async, don't wait)
          Appointment.findByIdAndUpdate(appointment._id, {
            payment_status: correctPaymentStatus
          }).catch(err => console.error('Error correcting payment status:', err))
        }
      }

      // Recalculate commission for appointments that don't have it yet
      if ((!appointment.barber_commission || appointment.barber_commission === 0) && appointment.barber_id && appointment.service_id && appointment.price) {
        // Get barber ID (handle both populated and non-populated)
        const barberId = appointment.barber_id._id || appointment.barber_id;
        const serviceId = appointment.service_id._id || appointment.service_id;
        
        if (barberId && serviceId) {
          const commission = await calculateCommission(
            appointment.price,
            barberId,
            serviceId
          );
          
          // Update the appointment in memory (for this response)
          appointment.barber_commission = commission.barber_commission;
          appointment.shop_cut = commission.shop_cut;
          
          // Also save to database (async, don't wait)
          Appointment.findByIdAndUpdate(appointment._id, {
            barber_commission: commission.barber_commission,
            shop_cut: commission.shop_cut
          }).catch(err => console.error('Error updating appointment commission:', err));
        }
      }
    }

    // Get total count for pagination
    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total: parseInt(total),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: appointments
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get real-time barber availability for walk-ins
// @route   GET /api/appointments/walk-in-availability
// @access  Private (receptionist, admin)
router.get('/walk-in-availability', protect, async (req, res, next) => {
  try {
    // Only receptionist and admin can access this
    if (req.user.role !== 'admin' && req.user.role !== 'receptionist') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access walk-in availability'
      });
    }

    // Validate service_id if provided
    const { service_id } = req.query;
    console.log('Walk-in availability request - service_id:', service_id, 'type:', typeof service_id);
    
    if (service_id && service_id !== '') {
      const isValid = mongoose.Types.ObjectId.isValid(service_id);
      console.log('Service ID validation result:', isValid, 'ID:', service_id);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Service ID must be a valid MongoDB ID'
        });
      }
    }
    const now = moment();
    const oneHourFromNow = moment().add(1, 'hour');

    // Get service duration (default to 30 minutes)
    let serviceDuration = 30;
    if (service_id) {
      try {
        const service = await Service.findById(service_id);
        if (service) {
          serviceDuration = service.duration;
        } else {
          console.log('Service not found for ID:', service_id);
        }
      } catch (error) {
        console.error('Error finding service:', error);
        // Continue with default duration
      }
    }

    // Get all active barbers in this shop
    const barbers = await User.find({ 
      role: 'barber', 
      status: 'active',
      admin_id: req.shop_id
    }).select('first_name last_name email phone');

    // Get all active appointments for this shop in the next hour
    const activeAppointments = await Appointment.find({
      admin_id: req.shop_id,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      appointment_date: { $lte: oneHourFromNow.toDate() },
      end_time: { $gte: now.toDate() }
    }).select('barber_id appointment_date end_time');

    // Calculate availability for each barber
    const barberAvailability = await Promise.all(barbers.map(async (barber) => {
      const barberAppointments = activeAppointments.filter(
        apt => apt.barber_id.toString() === barber._id.toString()
      );

      // Find next available slot
      let nextAvailableSlot = now.clone();
      const serviceEnd = nextAvailableSlot.clone().add(serviceDuration, 'minutes');

      // Check if barber is available right now
      const hasCurrentConflict = barberAppointments.some(apt => {
        const aptStart = moment(apt.appointment_date);
        const aptEnd = moment(apt.end_time);
        return (nextAvailableSlot.isBefore(aptEnd) && serviceEnd.isAfter(aptStart));
      });

      let availableNow = !hasCurrentConflict;

      // If not available now, find next available time
      if (!availableNow) {
        // Sort appointments by start time
        const sortedAppointments = barberAppointments
          .map(apt => ({
            start: moment(apt.appointment_date),
            end: moment(apt.end_time)
          }))
          .sort((a, b) => a.start - b.start);

        // Find gap between appointments or after last appointment
        for (let i = 0; i < sortedAppointments.length; i++) {
          const apt = sortedAppointments[i];
          if (now.isBefore(apt.start)) {
            const gapDuration = apt.start.diff(now, 'minutes');
            if (gapDuration >= serviceDuration) {
              nextAvailableSlot = now.clone();
              availableNow = true;
              break;
            }
          }
          
          // Check if we can fit after this appointment
          if (now.isAfter(apt.end) || now.isSame(apt.end)) {
            if (i === sortedAppointments.length - 1) {
              // This is the last appointment, available after it ends
              nextAvailableSlot = apt.end.clone();
              availableNow = true;
              break;
            } else {
              // Check gap to next appointment
              const nextApt = sortedAppointments[i + 1];
              const gapDuration = nextApt.start.diff(apt.end, 'minutes');
              if (gapDuration >= serviceDuration) {
                nextAvailableSlot = apt.end.clone();
                availableNow = true;
                break;
              }
            }
          }
        }

        // If no appointment found, check if we can fit after the last one
        if (!availableNow && sortedAppointments.length > 0) {
          const lastApt = sortedAppointments[sortedAppointments.length - 1];
          if (now.isAfter(lastApt.end) || now.isSame(lastApt.end)) {
            nextAvailableSlot = lastApt.end.clone();
            availableNow = true;
          }
        }
      }

      // If still not available, set to after last appointment or 1 hour from now
      if (!availableNow) {
        if (barberAppointments.length > 0) {
          const lastApt = barberAppointments
            .map(apt => moment(apt.end_time))
            .sort((a, b) => b - a)[0];
          nextAvailableSlot = lastApt.clone();
        } else {
          nextAvailableSlot = now.clone();
          availableNow = true;
        }
      }

      // Ensure next available slot is within 1 hour
      if (nextAvailableSlot.isAfter(oneHourFromNow)) {
        availableNow = false;
      }

      return {
        barber: {
          _id: barber._id,
          first_name: barber.first_name,
          last_name: barber.last_name,
          email: barber.email,
          phone: barber.phone
        },
        available_now: availableNow,
        next_available_slot: nextAvailableSlot.toISOString(), // Always provide next available slot
        current_appointments: barberAppointments.length,
        estimated_wait_time: availableNow ? 0 : Math.max(0, nextAvailableSlot.diff(now, 'minutes'))
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        service_duration: serviceDuration,
        barbers: barberAvailability
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Appointment ID must be a valid MongoDB ID')
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

    let appointment = await Appointment.findById(req.params.id)
      .populate('customer_id', 'first_name last_name email phone')
      .populate('barber_id', 'first_name last_name email phone')
      .populate('service_id', 'name duration price category');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Apply role-based filtering
    if (req.user.role === 'customer') {
      const customerId = req.user._id || req.user.id;
      if (appointment.customer_id.toString() !== customerId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this appointment'
        });
      }
    } else if (req.user.role === 'barber') {
      const barberId = req.user._id || req.user.id;
      if (appointment.barber_id.toString() !== barberId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this appointment'
        });
      }
    }
    // receptionist and admin can view any appointment

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
router.post('/', protect, [
  body('barber_id')
    .isMongoId()
    .withMessage('Barber ID must be a valid MongoDB ID'),
  body('service_id')
    .isMongoId()
    .withMessage('Service ID must be a valid MongoDB ID'),
  body('appointment_date')
    .isISO8601()
    .withMessage('Appointment date must be in ISO format')
    .custom((value, { req }) => {
      const appointmentDate = moment(value);
      const now = moment();
      const isWalkIn = req.body.is_walk_in === true || req.body.is_walk_in === 'true';
      
      // For walk-ins, allow current time or near future (within 1 hour)
      if (isWalkIn) {
        const oneHourFromNow = moment().add(1, 'hour');
        if (appointmentDate.isAfter(oneHourFromNow)) {
          throw new Error('Walk-in appointments must be within the next hour');
        }
        return true;
      }
      
      // For regular appointments, must be in the future
      if (appointmentDate.isBefore(now)) {
        throw new Error('Appointment date cannot be in the past');
      }
      
      // Allow appointments up to 3 months in advance
      const maxDate = moment().add(3, 'months');
      if (appointmentDate.isAfter(maxDate)) {
        throw new Error('Appointment date cannot be more than 3 months in advance');
      }
      
      return true;
    }),
  body('is_walk_in')
    .optional()
    .isBoolean()
    .withMessage('is_walk_in must be a boolean'),
  body('customer_notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Customer notes cannot exceed 500 characters')
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

    const { barber_id, service_id, appointment_date, customer_notes, customer_id, is_walk_in } = req.body;
    
    // For customers, use their own ID. For admin/receptionist/barber, allow specifying customer_id
    let finalCustomerId = req.user._id || req.user.id;
    if ((req.user.role === 'admin' || req.user.role === 'receptionist') && customer_id) {
      finalCustomerId = customer_id;
    }

    // Verify barber exists in this shop
    const barber = await User.findOne({ 
      _id: barber_id, 
      role: 'barber',
      admin_id: req.shop_id
    });

    if (!barber) {
      return res.status(400).json({
        success: false,
        error: 'Invalid barber or barber not available at your shop'
      });
    }

    // Verify service exists and is active for this shop
    const service = await Service.findOne({ 
      _id: service_id, 
      is_active: true,
      admin_id: req.shop_id
    });

    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service or service not available'
      });
    }

    // Calculate end time
    let appointmentStart = moment(appointment_date);
    let appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
    const now = moment();

    // For walk-ins, ensure appointment date is not too far in the past (allow up to 5 minutes)
    const isWalkIn = is_walk_in === true || is_walk_in === 'true';
    if (isWalkIn && appointmentStart.isBefore(now.clone().subtract(5, 'minutes'))) {
      return res.status(400).json({
        success: false,
        error: 'Walk-in appointment date cannot be more than 5 minutes in the past. Please refresh and try again.'
      });
    }

    // For regular appointments, ensure date is in the future
    if (!isWalkIn && appointmentStart.isBefore(now)) {
      return res.status(400).json({
        success: false,
        error: 'Appointment date must be in the future'
      });
    }

    // For walk-ins, automatically find the next available slot if there's a conflict
    if (isWalkIn) {
      // Check for initial conflict
      let conflict = await Appointment.checkConflict(
        barber_id,
        appointmentStart.toDate(),
        appointmentEnd.toDate(),
        null,
        req.shop_id
      );
      
      if (conflict) {
        // Find next available slot
        // Get all appointments for this barber starting from now
        const allAppointments = await Appointment.find({
          barber_id: barber_id,
          status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
          appointment_date: { $gte: now.toDate() }
        }).sort({ appointment_date: 1 });
        
        // Start from now or requested time, whichever is later
        let candidateStart = appointmentStart.isAfter(now) ? appointmentStart.clone() : now.clone();
        let foundSlot = false;
        
        if (allAppointments.length === 0) {
          // No appointments, can schedule now
          appointmentStart = candidateStart;
          appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
          foundSlot = true;
        } else {
          // Check if we can fit before the first appointment
          const firstAptStart = moment(allAppointments[0].appointment_date);
          const gapToFirst = firstAptStart.diff(candidateStart, 'minutes');
          
          if (gapToFirst >= service.duration) {
            // Can fit before first appointment
            appointmentStart = candidateStart;
            appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
            foundSlot = true;
          } else {
            // Need to find a gap between appointments or after the last one
            for (let i = 0; i < allAppointments.length; i++) {
              const aptEnd = moment(allAppointments[i].end_time);
              const nextApt = allAppointments[i + 1];
              
              if (!nextApt) {
                // This is the last appointment, schedule after it
                appointmentStart = aptEnd.clone();
                appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
                foundSlot = true;
                break;
              } else {
                // Check gap to next appointment
                const nextAptStart = moment(nextApt.appointment_date);
                const gap = nextAptStart.diff(aptEnd, 'minutes');
                
                if (gap >= service.duration) {
                  // Found a gap that fits
                  appointmentStart = aptEnd.clone();
                  appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
                  foundSlot = true;
                  break;
                }
              }
            }
          }
        }
        
        if (!foundSlot) {
          // Schedule after the last appointment
          const lastApt = allAppointments[allAppointments.length - 1];
          appointmentStart = moment(lastApt.end_time);
          appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
        }
        
        // Ensure the new time is not in the past
        if (appointmentStart.isBefore(now)) {
          appointmentStart = now.clone();
          appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
        }
        
        // Verify the new time doesn't conflict - retry up to 3 times if needed
        let retries = 0;
        const maxRetries = 3;
        while (retries < maxRetries) {
          conflict = await Appointment.checkConflict(
            barber_id,
            appointmentStart.toDate(),
            appointmentEnd.toDate(),
            null,
            req.shop_id
          );
          
          if (!conflict) {
            break; // No conflict, we're good
          }
          
          // Still has conflict, try scheduling after this conflict
          const conflictEnd = moment(conflict.end_time);
          appointmentStart = conflictEnd.clone();
          appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
          
          // Ensure not in the past
          if (appointmentStart.isBefore(now)) {
            appointmentStart = now.clone();
            appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');
          }
          
          retries++;
        }
        
        if (conflict && retries >= maxRetries) {
          // Still has conflict after retries
          console.error('Walk-in conflict resolution failed after retries:', {
            barber_id,
            adjusted_start: appointmentStart.format('YYYY-MM-DD HH:mm'),
            adjusted_end: appointmentEnd.format('YYYY-MM-DD HH:mm'),
            retries: retries
          });
          return res.status(400).json({
            success: false,
            error: 'Unable to find an available time slot for this walk-in appointment. Please try again or select a different barber.'
          });
        }
        
        console.log('Walk-in appointment time adjusted to avoid conflict:', {
          original_time: req.body.appointment_date,
          adjusted_start: appointmentStart.format('YYYY-MM-DD HH:mm'),
          adjusted_end: appointmentEnd.format('YYYY-MM-DD HH:mm')
        });
      }
    } else {
      // For regular appointments, use strict conflict checking
      const conflict = await Appointment.checkConflict(
        barber_id,
        appointmentStart.toDate(),
        appointmentEnd.toDate(),
        null,
        req.shop_id
      );

      if (conflict) {
        const conflictStart = moment(conflict.appointment_date).format('YYYY-MM-DD HH:mm');
        const conflictEnd = moment(conflict.end_time).format('YYYY-MM-DD HH:mm');
        
        console.log('Appointment conflict detected:', {
          barber_id,
          requested_start: appointmentStart.format('YYYY-MM-DD HH:mm'),
          requested_end: appointmentEnd.format('YYYY-MM-DD HH:mm'),
          conflict_start: conflictStart,
          conflict_end: conflictEnd,
          conflict_appointment_id: conflict._id
        });
        
        return res.status(400).json({
          success: false,
          error: `Barber is not available at the requested time. There is a conflicting appointment from ${conflictStart} to ${conflictEnd}. Please select a different time or barber.`,
          conflict_details: {
            conflicting_appointment_id: conflict._id,
            conflict_start: conflict.appointment_date,
            conflict_end: conflict.end_time
          }
        });
      }
    }

    // isWalkIn was already determined above, reuse it
    let appointmentStatus = 'scheduled';
    if (isWalkIn) {
      const checkNow = moment();
      // If appointment is starting now or within 5 minutes, set to in_progress
      if (appointmentStart.isSameOrBefore(checkNow.clone().add(5, 'minutes'))) {
        appointmentStatus = 'in_progress';
      } else {
        appointmentStatus = 'confirmed';
      }
    }

    // Calculate commission
    const commission = await calculateCommission(service.price, barber_id, service_id);

    const appointment = await Appointment.create({
      customer_id: finalCustomerId,
      barber_id,
      service_id,
      appointment_date: appointmentStart.toDate(),
      end_time: appointmentEnd.toDate(),
      is_walk_in: isWalkIn,
      customer_notes,
      price: service.price,
      shop_cut: commission.shop_cut,
      barber_commission: commission.barber_commission,
      status: appointmentStatus,
      admin_id: req.shop_id
    });

    // If appointment is created as completed, create inventory transactions
    if (appointmentStatus === 'completed') {
      const userId = req.user._id || req.user.id;
      // Run asynchronously to not block the response
      createInventoryTransactionsForAppointment(appointment, userId).catch(err => {
        console.error('Failed to create inventory transactions:', err);
      });
    }

    // Populate the appointment
    await appointment.populate([
      { path: 'customer_id', select: 'first_name last_name email phone' },
      { path: 'barber_id', select: 'first_name last_name email phone' },
      { path: 'service_id', select: 'name duration price category' }
    ]);

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('Appointment ID must be a valid MongoDB ID'),
  body('barber_id')
    .optional()
    .isMongoId()
    .withMessage('Barber ID must be a valid MongoDB ID'),
  body('appointment_date')
    .optional()
    .isISO8601()
    .withMessage('Appointment date must be in ISO format'),
  body('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .withMessage('Invalid status'),
  body('customer_notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Customer notes cannot exceed 500 characters'),
  body('barber_notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Barber notes cannot exceed 500 characters'),
  body('payment_status')
    .optional()
    .isIn(['pending', 'paid', 'partially_paid', 'refunded'])
    .withMessage('Invalid payment status'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'online', 'other'])
    .withMessage('Invalid payment method'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('amount_paid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount paid must be a positive number')
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

    let appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Apply role-based authorization
    if (req.user.role === 'customer') {
      const customerId = req.user._id || req.user.id;
      // Handle both populated and non-populated customer_id
      const appointmentCustomerId = appointment.customer_id?._id || appointment.customer_id;
      if (!appointmentCustomerId || appointmentCustomerId.toString() !== customerId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this appointment'
        });
      }
    } else if (req.user.role === 'barber') {
      const barberId = req.user._id || req.user.id;
      // Handle both populated and non-populated barber_id
      const appointmentBarberId = appointment.barber_id?._id || appointment.barber_id;
      const barberIdStr = barberId.toString();
      const appointmentBarberIdStr = appointmentBarberId ? appointmentBarberId.toString() : null;
      
      console.log('Barber authorization check:', {
        barberId: barberIdStr,
        appointmentBarberId: appointmentBarberIdStr,
        match: appointmentBarberIdStr === barberIdStr,
        barber_id_type: typeof appointment.barber_id,
        barber_id_value: appointment.barber_id
      });
      
      if (!appointmentBarberId || appointmentBarberIdStr !== barberIdStr) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this appointment'
        });
      }
    }
    // receptionist and admin can update any appointment

    // Check if appointment can be modified
    const appointmentDate = moment(appointment.appointment_date);
    const now = moment();
    const timeDiff = appointmentDate.diff(now, 'hours');

    if (req.user.role === 'customer' && timeDiff < 24 && req.body.appointment_date) {
      return res.status(400).json({
        success: false,
        error: 'Cannot reschedule appointment less than 24 hours in advance'
      });
    }

    const updateData = {};
    const { 
      appointment_date, 
      status, 
      customer_notes, 
      barber_notes, 
      payment_status, 
      payment_method,
      barber_id,
      price,
      amount_paid
    } = req.body;

    // Handle barber assignment (receptionist and admin only)
    if (barber_id && (req.user.role === 'admin' || req.user.role === 'receptionist')) {
      const barber = await User.findOne({ 
        _id: barber_id, 
        role: 'barber', 
        status: 'active' 
      });

      if (!barber) {
        return res.status(400).json({
          success: false,
          error: 'Invalid barber or barber not available'
        });
      }

      // Check for conflicts with new barber
      const service = await Service.findById(appointment.service_id);
      const appointmentStart = appointment_date ? moment(appointment_date) : moment(appointment.appointment_date);
      const appointmentEnd = appointmentStart.clone().add(service.duration, 'minutes');

      const conflict = await Appointment.checkConflict(
        barber_id,
        appointmentStart.toDate(),
        appointmentEnd.toDate(),
        appointment._id
      );

      if (conflict) {
        return res.status(400).json({
          success: false,
          error: 'Barber is not available at the requested time'
        });
      }

      updateData.barber_id = barber_id;
    }

    // Handle date change
    if (appointment_date) {
      const newStart = moment(appointment_date);
      
      if (newStart.isBefore(now)) {
        return res.status(400).json({
          success: false,
          error: 'Appointment date cannot be in the past'
        });
      }

      // Get service to calculate end time
      const service = await Service.findById(appointment.service_id);
      const newEnd = newStart.clone().add(service.duration, 'minutes');

      // Check for conflicts (excluding current appointment)
      const finalBarberId = updateData.barber_id || appointment.barber_id;
      const conflict = await Appointment.checkConflict(
        finalBarberId,
        newStart.toDate(),
        newEnd.toDate(),
        appointment._id
      );

      if (conflict) {
        return res.status(400).json({
          success: false,
          error: 'Barber is not available at the requested time'
        });
      }

      updateData.appointment_date = newStart.toDate();
      updateData.end_time = newEnd.toDate();
    }

    // Role-based field updates
    if (status !== undefined) {
      // Customers can only cancel their appointments
      if (req.user.role === 'customer' && status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          error: 'Customers can only cancel appointments'
        });
      }
      updateData.status = status;
    }

    if (customer_notes !== undefined) {
      updateData.customer_notes = customer_notes;
    }

    if (barber_notes !== undefined && (req.user.role === 'barber' || req.user.role === 'admin' || req.user.role === 'receptionist')) {
      updateData.barber_notes = barber_notes;
    }

    // Payment management (receptionist, barber, and admin)
    const finalPrice = price !== undefined ? price : appointment.price;
    const finalAmountPaid = amount_paid !== undefined ? amount_paid : appointment.amount_paid || 0;
    
    // Recalculate commission if price or barber changes
    const finalBarberId = updateData.barber_id || appointment.barber_id;
    const finalServiceId = appointment.service_id;
    if (price !== undefined || updateData.barber_id) {
      const commission = await calculateCommission(finalPrice, finalBarberId, finalServiceId);
      updateData.shop_cut = commission.shop_cut;
      updateData.barber_commission = commission.barber_commission;
    }
    
    // Handle amount_paid (receptionist, barber, and admin)
    if (amount_paid !== undefined && (req.user.role === 'barber' || req.user.role === 'admin' || req.user.role === 'receptionist')) {
      // Validate amount_paid doesn't exceed price
      if (finalPrice && amount_paid > finalPrice) {
        return res.status(400).json({
          success: false,
          error: 'Amount paid cannot exceed the total price'
        });
      }
      updateData.amount_paid = amount_paid;
    }

    // Automatically determine payment_status based on amount_paid if both are being updated
    if (payment_status !== undefined && (req.user.role === 'barber' || req.user.role === 'admin' || req.user.role === 'receptionist')) {
      // If amount_paid is also being updated, validate that status matches
      if (amount_paid !== undefined) {
        let expectedStatus;
        if (finalAmountPaid === 0) {
          expectedStatus = 'pending';
        } else if (finalAmountPaid >= finalPrice) {
          expectedStatus = 'paid';
        } else {
          expectedStatus = 'partially_paid';
        }
        
        // Auto-correct the status if it doesn't match
        if (payment_status !== expectedStatus && payment_status !== 'refunded') {
          updateData.payment_status = expectedStatus;
        } else {
          updateData.payment_status = payment_status;
        }
      } else {
        updateData.payment_status = payment_status;
      }
    } else if (amount_paid !== undefined && payment_status === undefined) {
      // If only amount_paid is being updated, auto-determine status
      let autoStatus;
      if (finalAmountPaid === 0) {
        autoStatus = 'pending';
      } else if (finalAmountPaid >= finalPrice) {
        autoStatus = 'paid';
      } else {
        autoStatus = 'partially_paid';
      }
      updateData.payment_status = autoStatus;
    }

    if (payment_method !== undefined && (req.user.role === 'barber' || req.user.role === 'admin' || req.user.role === 'receptionist')) {
      updateData.payment_method = payment_method;
    }

    if (price !== undefined && (req.user.role === 'admin' || req.user.role === 'receptionist')) {
      updateData.price = price;
    }

    // Ensure payment_status matches amount_paid (fix any inconsistencies)
    const finalAmountPaidAfterUpdate = updateData.amount_paid !== undefined 
      ? updateData.amount_paid 
      : (appointment.amount_paid || 0)
    const finalPriceAfterUpdate = updateData.price !== undefined 
      ? updateData.price 
      : appointment.price

    // Auto-correct payment_status if it doesn't match amount_paid
    if (finalPriceAfterUpdate && finalPriceAfterUpdate > 0) {
      let correctStatus;
      if (finalAmountPaidAfterUpdate === 0) {
        correctStatus = 'pending'
      } else if (finalAmountPaidAfterUpdate >= finalPriceAfterUpdate) {
        correctStatus = 'paid'
      } else {
        correctStatus = 'partially_paid'
      }
      
      // Only auto-correct if status wasn't explicitly set or if it's wrong
      if (updateData.payment_status === undefined || 
          (updateData.payment_status !== correctStatus && updateData.payment_status !== 'refunded')) {
        updateData.payment_status = correctStatus
      }
    }

    // Check if status is being changed to 'completed'
    const isBeingCompleted = status === 'completed' && appointment.status !== 'completed';
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // If appointment was just completed, create inventory transactions
    if (isBeingCompleted) {
      const userId = req.user._id || req.user.id;
      // Run asynchronously to not block the response
      createInventoryTransactionsForAppointment(updatedAppointment, userId).catch(err => {
        console.error('Failed to create inventory transactions:', err);
      });
    }

    // Populate the appointment
    await updatedAppointment.populate([
      { path: 'customer_id', select: 'first_name last_name email phone' },
      { path: 'barber_id', select: 'first_name last_name email phone' },
      { path: 'service_id', select: 'name duration price category' }
    ]);

    res.status(200).json({
      success: true,
      data: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Appointment ID must be a valid MongoDB ID')
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

    let appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Apply role-based authorization
    if (req.user.role === 'customer') {
      const customerId = req.user._id || req.user.id;
      if (appointment.customer_id.toString() !== customerId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this appointment'
        });
      }
    } else if (req.user.role === 'barber') {
      const barberId = req.user._id || req.user.id;
      if (appointment.barber_id.toString() !== barberId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this appointment'
        });
      }
    }
    // receptionist and admin can delete any appointment

    // Only allow deletion of cancelled or no-show appointments, or admin/receptionist override
    if ((req.user.role !== 'admin' && req.user.role !== 'receptionist') && !['cancelled', 'no_show'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        error: 'Only cancelled or no-show appointments can be deleted'
      });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get available time slots for a barber on a specific date
// @route   GET /api/appointments/available-slots/:barberId/:date
// @access  Public
router.get('/available-slots/:barberId/:date', optionalAuth, [
  param('barberId').isMongoId().withMessage('Barber ID must be a valid MongoDB ID'),
  param('date').isISO8601().withMessage('Date must be in ISO format')
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

    const { barberId, date } = req.params;
    const { service_id } = req.query;

    // Verify barber exists and is active
    const barber = await User.findOne({ 
      _id: barberId, 
      role: 'barber', 
      status: 'active' 
    });

    if (!barber) {
      return res.status(404).json({
        success: false,
        error: 'Barber not found'
      });
    }

    // Get service duration (default to 30 minutes)
    let serviceDuration = 30;
    if (service_id) {
      const service = await Service.findById(service_id);
      if (service) {
        serviceDuration = service.duration;
      }
    }

    const requestedDate = moment(date).format('YYYY-MM-DD');
    
    // Check if date is in the past
    if (moment(requestedDate).isBefore(moment().format('YYYY-MM-DD'))) {
      return res.status(400).json({
        success: false,
        error: 'Cannot get slots for past dates'
      });
    }

    // Get barber schedule for the day (for now, assume 9 AM to 6 PM)
    const workingHours = {
      start: '09:00',
      end: '18:00',
      breakStart: '12:00',
      breakEnd: '13:00'
    };

    // Get existing appointments for the barber on this date
    const startOfDay = moment(requestedDate).startOf('day').toDate();
    const endOfDay = moment(requestedDate).endOf('day').toDate();
    
    const existingAppointments = await Appointment.find({
      barber_id: barberId,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      appointment_date: { $gte: startOfDay, $lte: endOfDay }
    }).select('appointment_date end_time');

    // Generate available time slots
    const slots = [];
    const startTime = moment(`${requestedDate} ${workingHours.start}`);
    const endTime = moment(`${requestedDate} ${workingHours.end}`);
    const breakStart = moment(`${requestedDate} ${workingHours.breakStart}`);
    const breakEnd = moment(`${requestedDate} ${workingHours.breakEnd}`);

    let currentSlot = startTime.clone();

    while (currentSlot.clone().add(serviceDuration, 'minutes').isSameOrBefore(endTime)) {
      const slotStart = currentSlot.clone();
      const slotEnd = currentSlot.clone().add(serviceDuration, 'minutes');

      // Skip break time
      if (slotStart.isBefore(breakEnd) && slotEnd.isAfter(breakStart)) {
        currentSlot.add(15, 'minutes');
        continue;
      }

      // Skip if current time is less than 1 hour from now (for today)
      if (moment(requestedDate).isSame(moment(), 'day') && slotStart.isBefore(moment().add(1, 'hour'))) {
        currentSlot.add(15, 'minutes');
        continue;
      }

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentStart = moment(appointment.appointment_date);
        const appointmentEnd = moment(appointment.end_time);
        
        return (slotStart.isBefore(appointmentEnd) && slotEnd.isAfter(appointmentStart));
      });

      if (!hasConflict) {
        slots.push({
          time: slotStart.format('HH:mm'),
          datetime: slotStart.format('YYYY-MM-DD HH:mm:ss'),
          available: true
        });
      }

      currentSlot.add(15, 'minutes'); // 15-minute intervals
    }

    res.status(200).json({
      success: true,
      data: {
        date: requestedDate,
        barber_id: barberId,
        service_duration: serviceDuration,
        available_slots: slots
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
