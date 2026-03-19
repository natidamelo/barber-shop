/**
 * Script to recalculate commissions for all existing appointments
 * Run this once to backfill commission data for appointments created before the commission feature
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Appointment, User, Service } = require('../models');

// Helper function to calculate commission (same as in routes)
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

const recalculateCommissions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('Connected to MongoDB');

    // Find all appointments that need commission calculation
    const appointments = await Appointment.find({
      price: { $exists: true, $gt: 0 },
      barber_id: { $exists: true },
      service_id: { $exists: true }
    }).populate('barber_id', 'commission_percentage role').populate('service_id', 'shop_cut');

    console.log(`Found ${appointments.length} appointments to process`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const appointment of appointments) {
      try {
        // Skip if already has commission calculated (unless it's 0 and should be recalculated)
        if (appointment.barber_commission !== undefined && appointment.barber_commission !== null && appointment.barber_commission > 0) {
          skipped++;
          continue;
        }

        if (!appointment.barber_id || !appointment.service_id || !appointment.price) {
          skipped++;
          continue;
        }

        const commission = await calculateCommission(
          appointment.price,
          appointment.barber_id._id || appointment.barber_id,
          appointment.service_id._id || appointment.service_id
        );

        // Update appointment
        await Appointment.findByIdAndUpdate(appointment._id, {
          barber_commission: commission.barber_commission,
          shop_cut: commission.shop_cut
        });

        updated++;
        
        if (updated % 10 === 0) {
          console.log(`Processed ${updated} appointments...`);
        }
      } catch (error) {
        console.error(`Error processing appointment ${appointment._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Commission Recalculation Complete ===');
    console.log(`Total appointments: ${appointments.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error in recalculateCommissions:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  recalculateCommissions();
}

module.exports = { recalculateCommissions };
