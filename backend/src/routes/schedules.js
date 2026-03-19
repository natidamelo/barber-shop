const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { StaffSchedule, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
router.get('/', protect, [
  query('staff_id').optional().isMongoId().withMessage('Staff ID must be a valid MongoDB ID'),
  query('start_date').optional().isISO8601().withMessage('Start date must be in ISO format'),
  query('end_date').optional().isISO8601().withMessage('End date must be in ISO format'),
  query('date').optional().isISO8601().withMessage('Date must be in ISO format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { staff_id, start_date, end_date, date } = req.query;
    
    let query = {};

    // Role-based filtering
    if (req.user.role === 'barber') {
      query.staff_id = req.user._id || req.user.id;
    } else if (staff_id && (req.user.role === 'admin' || req.user.role === 'receptionist')) {
      query.staff_id = staff_id;
    }

    // Date filtering
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (start_date || end_date) {
      query.date = {};
      if (start_date) {
        const start = new Date(start_date);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const schedules = await StaffSchedule.find(query)
      .populate('staff_id', 'first_name last_name email')
      .sort({ date: 1, start_time: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single schedule
// @route   GET /api/schedules/:id
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Schedule ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const schedule = await StaffSchedule.findById(req.params.id)
      .populate('staff_id', 'first_name last_name email');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    // Check authorization
    if (req.user.role === 'barber' && schedule.staff_id._id.toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this schedule'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private (Admin/Barber)
router.post('/', protect, authorize('admin', 'barber'), [
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO format'),
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('break_start')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Break start time must be in HH:MM format'),
  body('break_end')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Break end time must be in HH:MM format'),
  body('staff_id')
    .optional()
    .isMongoId()
    .withMessage('Staff ID must be a valid MongoDB ID'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { date, start_time, end_time, break_start, break_end, staff_id, notes, is_available, schedule_type } = req.body;

    // Determine staff_id based on role
    let finalStaffId = req.user._id || req.user.id;
    if (req.user.role === 'admin' && staff_id) {
      finalStaffId = staff_id;
    } else if (req.user.role === 'barber') {
      // Barbers can only create schedules for themselves
      finalStaffId = req.user._id || req.user.id;
    }

    // Verify staff exists
    const staff = await User.findById(finalStaffId);
    if (!staff || (staff.role !== 'barber' && staff.role !== 'receptionist')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff member'
      });
    }

    // Check if schedule already exists for this date
    const existingSchedule = await StaffSchedule.findOne({
      staff_id: finalStaffId,
      date: new Date(date)
    });

    if (existingSchedule) {
      return res.status(400).json({
        success: false,
        error: 'Schedule already exists for this date'
      });
    }

    const schedule = await StaffSchedule.create({
      staff_id: finalStaffId,
      date: new Date(date),
      start_time,
      end_time,
      break_start: break_start || null,
      break_end: break_end || null,
      notes: notes || '',
      is_available: is_available !== undefined ? is_available : true,
      schedule_type: schedule_type || 'regular'
    });

    await schedule.populate('staff_id', 'first_name last_name email');

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    if (error.message.includes('End time must be after start time') || 
        error.message.includes('Break times must be within working hours')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private (Admin/Barber)
router.put('/:id', protect, authorize('admin', 'barber'), [
  param('id').isMongoId().withMessage('Schedule ID must be a valid MongoDB ID'),
  body('start_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('end_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('break_start')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Break start time must be in HH:MM format'),
  body('break_end')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Break end time must be in HH:MM format'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const schedule = await StaffSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    // Check authorization
    if (req.user.role === 'barber' && schedule.staff_id.toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this schedule'
      });
    }

    const updateData = {};
    const { start_time, end_time, break_start, break_end, notes, is_available, schedule_type } = req.body;

    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (break_start !== undefined) updateData.break_start = break_start || null;
    if (break_end !== undefined) updateData.break_end = break_end || null;
    if (notes !== undefined) updateData.notes = notes;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (schedule_type !== undefined) updateData.schedule_type = schedule_type;

    const updatedSchedule = await StaffSchedule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('staff_id', 'first_name last_name email');

    res.status(200).json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    if (error.message.includes('End time must be after start time') || 
        error.message.includes('Break times must be within working hours')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private (Admin/Barber)
router.delete('/:id', protect, authorize('admin', 'barber'), [
  param('id').isMongoId().withMessage('Schedule ID must be a valid MongoDB ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const schedule = await StaffSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    // Check authorization
    if (req.user.role === 'barber' && schedule.staff_id.toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this schedule'
      });
    }

    await StaffSchedule.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
