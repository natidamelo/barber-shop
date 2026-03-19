require('dotenv').config();
const connectDB = require('../config/database');
const { User, Service, Inventory } = require('../models');

const seedUsers = async () => {
  console.log('🌱 Seeding users...');
  
  // Clear existing users
  await User.deleteMany({});
  
  const users = [
    {
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@barbershop.com',
      phone: '+1234567890',
      password: 'Admin123',
      role: 'superadmin',
      status: 'active',
      bio: 'System administrator with full access to manage the barber shop.',
      email_verified_at: new Date()
    },
    {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@barbershop.com',
      phone: '+1234567891',
      password: 'barber123',
      role: 'barber',
      status: 'active',
      bio: 'Master barber with 15 years of experience specializing in classic cuts and modern styles.',
      email_verified_at: new Date()
    },
    {
      first_name: 'Mike',
      last_name: 'Johnson',
      email: 'mike.johnson@barbershop.com',
      phone: '+1234567892',
      password: 'barber123',
      role: 'barber',
      status: 'active',
      bio: 'Professional barber specializing in beard grooming and premium men\'s styling.',
      email_verified_at: new Date()
    },
    {
      first_name: 'David',
      last_name: 'Wilson',
      email: 'david.wilson@example.com',
      phone: '+1234567893',
      password: 'customer123',
      role: 'customer',
      status: 'active',
      bio: 'Regular customer who values quality haircuts and professional service.',
      preferences: {
        preferred_barber: null, // Will be set after barbers are created
        notification_preferences: {
          email: true,
          sms: true,
          reminder_hours: 24
        }
      },
      email_verified_at: new Date()
    },
    {
      first_name: 'Sarah',
      last_name: 'Brown',
      email: 'sarah.brown@example.com',
      phone: '+1234567894',
      password: 'customer123',
      role: 'customer',
      status: 'active',
      preferences: {
        notification_preferences: {
          email: true,
          sms: false,
          reminder_hours: 48
        }
      },
      email_verified_at: new Date()
    },
    {
      first_name: 'Emily',
      last_name: 'Davis',
      email: 'emily.davis@barbershop.com',
      phone: '+1234567895',
      password: 'receptionist123',
      role: 'receptionist',
      status: 'active',
      bio: 'Front desk receptionist managing appointments, barber assignments, and billing.',
      email_verified_at: new Date()
    }
  ];

  // Use create() instead of insertMany() to trigger password hashing middleware
  const createdUsers = [];
  for (const userData of users) {
    const user = await User.create(userData);
    createdUsers.push(user);
  }
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
};

const seedServices = async () => {
  console.log('🌱 Seeding services...');
  
  // Clear existing services
  await Service.deleteMany({});
  
  const services = [
    {
      name: 'Classic Men\'s Haircut',
      description: 'Traditional haircut with scissors and clipper work. Includes consultation, wash, cut, and styling.',
      price: 25.00,
      duration: 45,
      category: 'Haircuts',
      is_active: true,
      sort_order: 1
    },
    {
      name: 'Beard Trim & Shape',
      description: 'Professional beard trimming and shaping service. Includes hot towel treatment and moisturizing.',
      price: 20.00,
      duration: 30,
      category: 'Beard Services',
      is_active: true,
      sort_order: 2
    },
    {
      name: 'Premium Cut & Wash',
      description: 'Deluxe haircut service with premium shampoo, conditioning treatment, precision cutting, and styling.',
      price: 45.00,
      duration: 60,
      category: 'Premium Services',
      is_active: true,
      sort_order: 3
    },
    {
      name: 'Buzz Cut',
      description: 'Quick and efficient buzz cut with clipper work. Perfect for low-maintenance styles.',
      price: 15.00,
      duration: 20,
      category: 'Haircuts',
      is_active: true,
      sort_order: 4
    },
    {
      name: 'Hot Towel Shave',
      description: 'Traditional wet shave with hot towel preparation, premium shaving cream, and aftershave treatment.',
      price: 35.00,
      duration: 45,
      category: 'Shave Services',
      is_active: true,
      sort_order: 5
    },
    {
      name: 'Fade Cut',
      description: 'Modern fade haircut with precise blending and contemporary styling techniques.',
      price: 30.00,
      duration: 50,
      category: 'Haircuts',
      is_active: true,
      sort_order: 6
    },
    {
      name: 'Mustache Trim',
      description: 'Professional mustache grooming and shaping service.',
      price: 12.00,
      duration: 15,
      category: 'Beard Services',
      is_active: true,
      sort_order: 7
    },
    {
      name: 'Hair Wash & Style',
      description: 'Professional wash and styling service without cutting.',
      price: 18.00,
      duration: 30,
      category: 'Styling',
      is_active: true,
      sort_order: 8
    },
    {
      name: 'Complete Grooming Package',
      description: 'Full service package including haircut, beard trim, hot towel shave, and styling.',
      price: 75.00,
      duration: 90,
      category: 'Premium Services',
      is_active: true,
      sort_order: 9
    },
    {
      name: 'Senior Cut (65+)',
      description: 'Special pricing for senior citizens. Includes consultation, wash, cut, and styling.',
      price: 20.00,
      duration: 45,
      category: 'Special Offers',
      is_active: true,
      sort_order: 10
    }
  ];

  const createdServices = await Service.insertMany(services);
  console.log(`✅ Created ${createdServices.length} services`);
  return createdServices;
};

const seedInventory = async () => {
  console.log('🌱 Seeding inventory...');
  
  // Clear existing inventory
  await Inventory.deleteMany({});
  
  const inventory = [
    {
      name: 'Professional Hair Scissors',
      description: 'High-quality stainless steel hair cutting scissors',
      sku: 'SCIS001',
      category: 'Tools',
      brand: 'Jaguar',
      cost_price: 85.00,
      selling_price: 120.00,
      current_stock: 8,
      minimum_stock: 3,
      maximum_stock: 15,
      unit: 'piece',
      supplier: 'Beauty Supply Co.',
      supplier_contact: 'orders@beautysupply.com',
      is_active: true
    },
    {
      name: 'Premium Shampoo',
      description: 'Professional grade shampoo for all hair types',
      sku: 'SHAM001',
      category: 'Hair Care',
      brand: 'Paul Mitchell',
      cost_price: 12.50,
      selling_price: 18.00,
      current_stock: 25,
      minimum_stock: 10,
      maximum_stock: 50,
      unit: 'bottle',
      supplier: 'Professional Hair Products',
      supplier_contact: '+1234567899',
      is_active: true
    },
    {
      name: 'Hair Clippers',
      description: 'Professional cordless hair clippers with multiple guards',
      sku: 'CLIP001',
      category: 'Tools',
      brand: 'Wahl',
      cost_price: 65.00,
      selling_price: 95.00,
      current_stock: 6,
      minimum_stock: 2,
      maximum_stock: 10,
      unit: 'piece',
      supplier: 'Barber Equipment Inc.',
      supplier_contact: 'sales@barberequip.com',
      is_active: true
    },
    {
      name: 'Styling Gel',
      description: 'Strong hold styling gel for modern hairstyles',
      sku: 'GEL001',
      category: 'Styling Products',
      brand: 'American Crew',
      cost_price: 8.25,
      selling_price: 12.00,
      current_stock: 15,
      minimum_stock: 8,
      maximum_stock: 30,
      unit: 'tube',
      supplier: 'Professional Hair Products',
      supplier_contact: '+1234567899',
      is_active: true
    },
    {
      name: 'Disinfectant Spray',
      description: 'Professional grade disinfectant for tools and surfaces',
      sku: 'DIS001',
      category: 'Sanitation',
      brand: 'Barbicide',
      cost_price: 8.00,
      selling_price: 12.50,
      current_stock: 3,
      minimum_stock: 5,
      maximum_stock: 15,
      unit: 'bottle',
      supplier: 'Salon Safety Supply',
      supplier_contact: 'orders@salonsafety.com',
      notes: 'Low stock - reorder soon',
      is_active: true
    }
  ];

  const createdInventory = await Inventory.insertMany(inventory);
  console.log(`✅ Created ${createdInventory.length} inventory items`);
  return createdInventory;
};

const runSeed = async () => {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Run seeds
    await seedUsers();
    await seedServices();
    await seedInventory();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Accounts:');
    console.log('👤 Admin: admin@barbershop.com / admin123');
    console.log('✂️  Barber: john.smith@barbershop.com / barber123');
    console.log('👤 Customer: david.wilson@example.com / customer123');
    console.log('📋 Receptionist: emily.davis@barbershop.com / receptionist123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runSeed();
}

module.exports = { seedUsers, seedServices, seedInventory };