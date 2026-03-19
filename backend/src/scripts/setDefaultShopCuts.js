/**
 * Script to set default shop_cut values for services
 * This sets shop_cut as a percentage of service price (e.g., 33% of price)
 * You can modify the percentage or set specific amounts per service
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Service } = require('../models');

const setDefaultShopCuts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('Connected to MongoDB');

    // Get all services
    const services = await Service.find({});
    console.log(`Found ${services.length} services to process`);

    let updated = 0;

    // Define shop cut rules (you can customize these)
    // Option 1: Set as percentage of price (e.g., 33% = 1/3 of price)
    const SHOP_CUT_PERCENTAGE = 0.33; // 33% of service price

    // Option 2: Set specific amounts based on service price ranges or names
    // Based on your example: Service 1200 ETB, Shop takes 400 ETB, Barber gets 60% of remaining 800 ETB
    const shopCutRules = {
      // Specific amounts for specific services (customize these values)
      'Classic Men\'s Haircut': 400, // If price is 1200, shop takes 400, barber gets 60% of 800 = 480
      'Beard Trim & Shape': 200,     // If price is 800, shop takes 200, barber gets 60% of 600 = 360
      'Premium Cut & Wash': 600,
      'Buzz Cut': 200,
      'Hot Towel Shave': 300,
      'Fade Cut': 400,
      'Mustache Trim': 100,
      'Hair Wash & Style': 150,
      'Complete Grooming Package': 800,
      'Senior Cut (65+)': 200
    };

    for (const service of services) {
      let shopCut = 0;

      // Check if there's a specific rule for this service
      if (shopCutRules[service.name]) {
        shopCut = shopCutRules[service.name];
      } else {
        // Default: use percentage of price
        shopCut = Math.round(service.price * SHOP_CUT_PERCENTAGE * 100) / 100;
      }

      // Only update if shop_cut is currently 0 or not set
      if (!service.shop_cut || service.shop_cut === 0) {
        await Service.findByIdAndUpdate(service._id, {
          shop_cut: shopCut
        });

        console.log(`Updated ${service.name}: Shop Cut = ${shopCut} ETB (Service Price: ${service.price} ETB)`);
        updated++;
      } else {
        console.log(`Skipped ${service.name}: Already has shop_cut = ${service.shop_cut} ETB`);
      }
    }

    console.log('\n=== Shop Cut Update Complete ===');
    console.log(`Total services: ${services.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${services.length - updated}`);

    // After updating shop_cuts, recalculate commissions for all appointments
    if (updated > 0) {
      console.log('\n=== Recalculating Commissions for Existing Appointments ===');
      const { Appointment, User } = require('../models');
      
      // Helper function to calculate commission (same as in routes)
      const calculateCommission = async (price, barberId, serviceId) => {
        try {
          const barber = await User.findById(barberId).select('commission_percentage role');
          if (!barber || barber.role !== 'barber') {
            return { shop_cut: 0, barber_commission: 0 };
          }

          const service = await Service.findById(serviceId).select('shop_cut');
          if (!service) {
            return { shop_cut: 0, barber_commission: 0 };
          }

          const shopCut = service.shop_cut || 0;
          const remainingAmount = Math.max(0, price - shopCut);
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

      // Recalculate commissions for all appointments
      const appointments = await Appointment.find({
        price: { $exists: true, $gt: 0 },
        barber_id: { $exists: true },
        service_id: { $exists: true }
      }).populate('barber_id', 'commission_percentage role').populate('service_id', 'shop_cut');

      let commUpdated = 0;
      for (const appointment of appointments) {
        if (!appointment.barber_id || !appointment.service_id || !appointment.price) continue;

        const commission = await calculateCommission(
          appointment.price,
          appointment.barber_id._id || appointment.barber_id,
          appointment.service_id._id || appointment.service_id
        );

        await Appointment.findByIdAndUpdate(appointment._id, {
          barber_commission: commission.barber_commission,
          shop_cut: commission.shop_cut
        });

        commUpdated++;
        if (commUpdated % 10 === 0) {
          console.log(`Recalculated ${commUpdated} appointments...`);
        }
      }
      console.log(`✅ Recalculated commissions for ${commUpdated} appointments`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error in setDefaultShopCuts:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  setDefaultShopCuts();
}

module.exports = { setDefaultShopCuts };
