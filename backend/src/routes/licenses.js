const express = require('express');
const { body, validationResult } = require('express-validator');
const { License } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── Admin: List all licenses ────────────────────────────────────────────────
// GET /api/licenses
router.get('/', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { license_key: { $regex: search, $options: 'i' } },
        { customer_name: { $regex: search, $options: 'i' } },
        { customer_email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [licenses, total] = await Promise.all([
      License.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      License.countDocuments(query)
    ]);

    // Auto-mark expired licenses
    const now = new Date();
    const expiredIds = licenses
      .filter(l => l.status === 'active' && l.expire_date < now)
      .map(l => l._id);
    if (expiredIds.length) {
      await License.updateMany({ _id: { $in: expiredIds } }, { status: 'expired' });
      licenses.forEach(l => {
        if (expiredIds.some(id => id.equals(l._id))) l.status = 'expired';
      });
    }

    res.json({
      success: true,
      data: licenses,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Generate new license ─────────────────────────────────────────────
// POST /api/licenses/generate
router.post('/generate', protect, authorize('superadmin'), [
  body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
  body('customer_email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('customer_phone').optional().trim(),
  body('notes').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { customer_name, customer_email, customer_phone, notes } = req.body;

    const start_date = new Date();
    const expire_date = new Date(start_date);
    expire_date.setFullYear(expire_date.getFullYear() + 1);

    // Ensure unique key
    let license_key;
    let attempts = 0;
    do {
      license_key = License.generateKey();
      attempts++;
      if (attempts > 10) throw new Error('Could not generate unique license key');
    } while (await License.findOne({ license_key }));

    const license = await License.create({
      license_key,
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      start_date,
      expire_date,
      status: 'pending_activation',
      notes: notes || null
    });

    res.status(201).json({ success: true, data: license });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Renew license (extend by 1 year) ─────────────────────────────────
// PUT /api/licenses/:id/renew
router.put('/:id/renew', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const license = await License.findById(req.params.id);
    if (!license) {
      return res.status(404).json({ success: false, error: 'License not found' });
    }

    const previous_expire_date = license.expire_date;

    // If expired, renew from today; otherwise extend from current expire date
    const base = license.expire_date < new Date() ? new Date() : new Date(license.expire_date);
    const new_expire_date = new Date(base);
    new_expire_date.setFullYear(new_expire_date.getFullYear() + 1);

    license.expire_date = new_expire_date;
    license.status = license.computer_id ? 'active' : 'pending_activation';
    license.renewal_history.push({
      renewed_at: new Date(),
      previous_expire_date,
      new_expire_date,
      renewed_by: req.user.email || req.user._id.toString()
    });

    await license.save();

    res.json({ success: true, data: license, message: 'License renewed successfully for 1 year' });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Update license status ────────────────────────────────────────────
// PUT /api/licenses/:id/status
router.put('/:id/status', protect, authorize('superadmin'), [
  body('status').isIn(['active', 'suspended', 'pending_activation']).withMessage('Invalid status')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const license = await License.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!license) return res.status(404).json({ success: false, error: 'License not found' });

    res.json({ success: true, data: license });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Delete license ────────────────────────────────────────────────────
// DELETE /api/licenses/:id
router.delete('/:id', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const license = await License.findByIdAndDelete(req.params.id);
    if (!license) return res.status(404).json({ success: false, error: 'License not found' });

    res.json({ success: true, message: 'License deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── Public: Activate license (bind to computer) ─────────────────────────────
// POST /api/licenses/activate
router.post('/activate', [
  body('license_key').trim().notEmpty().withMessage('License key is required'),
  body('computer_id').trim().notEmpty().withMessage('Computer ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { license_key, computer_id } = req.body;
    const license = await License.findOne({ license_key: license_key.toUpperCase() });

    if (!license) {
      return res.status(404).json({ success: false, error: 'Invalid license key' });
    }

    if (license.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'This license has been suspended. Contact support.' });
    }

    if (license.expire_date < new Date()) {
      await License.findByIdAndUpdate(license._id, { status: 'expired' });
      return res.status(403).json({ success: false, error: 'This license has expired. Please renew.' });
    }

    // If already bound to a different computer
    if (license.computer_id && license.computer_id !== computer_id) {
      return res.status(403).json({
        success: false,
        error: 'This license is already activated on another computer. Contact admin to transfer.'
      });
    }

    license.computer_id = computer_id;
    license.status = 'active';
    license.activated_at = license.activated_at || new Date();
    license.last_checked_at = new Date();
    await license.save();

    res.json({
      success: true,
      message: 'License activated successfully',
      data: {
        license_key: license.license_key,
        customer_name: license.customer_name,
        expire_date: license.expire_date,
        days_remaining: license.days_remaining,
        status: license.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Public/Protected: Validate license on login ─────────────────────────────
// POST /api/licenses/validate
router.post('/validate', [
  body('license_key').trim().notEmpty().withMessage('License key is required'),
  body('computer_id').trim().notEmpty().withMessage('Computer ID is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { license_key, computer_id } = req.body;
    const license = await License.findOne({ license_key: license_key.toUpperCase() });

    if (!license) {
      return res.status(404).json({ success: false, valid: false, error: 'Invalid license key' });
    }

    if (license.status === 'suspended') {
      return res.status(403).json({ success: false, valid: false, error: 'License suspended. Contact support.' });
    }

    if (license.computer_id && license.computer_id !== computer_id) {
      return res.status(403).json({ success: false, valid: false, error: 'License is bound to a different computer.' });
    }

    const now = new Date();
    if (license.expire_date < now) {
      if (license.status !== 'expired') {
        await License.findByIdAndUpdate(license._id, { status: 'expired' });
        license.status = 'expired';
      }
      return res.status(403).json({
        success: false,
        valid: false,
        error: `License expired on ${license.expire_date.toLocaleDateString()}. Please renew.`,
        expire_date: license.expire_date
      });
    }

    // Update last checked timestamp
    await License.findByIdAndUpdate(license._id, { last_checked_at: now });

    res.json({
      success: true,
      valid: true,
      data: {
        license_key: license.license_key,
        customer_name: license.customer_name,
        expire_date: license.expire_date,
        days_remaining: license.days_remaining,
        status: license.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Get single license ────────────────────────────────────────────────
// GET /api/licenses/:id
router.get('/:id', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const license = await License.findById(req.params.id);
    if (!license) return res.status(404).json({ success: false, error: 'License not found' });
    res.json({ success: true, data: license });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
