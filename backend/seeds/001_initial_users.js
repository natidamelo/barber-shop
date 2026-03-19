const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 12);
  const barberPassword = await bcrypt.hash('barber123', 12);
  const customerPassword = await bcrypt.hash('customer123', 12);

  // Insert seed entries
  await knex('users').insert([
    {
      id: 1,
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@barbershop.com',
      phone: '+1234567890',
      password: adminPassword,
      role: 'admin',
      status: 'active',
      bio: 'System administrator with full access to manage the barber shop.',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@barbershop.com',
      phone: '+1234567891',
      password: barberPassword,
      role: 'barber',
      status: 'active',
      bio: 'Master barber with 15 years of experience specializing in classic cuts and modern styles.',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      first_name: 'Mike',
      last_name: 'Johnson',
      email: 'mike.johnson@barbershop.com',
      phone: '+1234567892',
      password: barberPassword,
      role: 'barber',
      status: 'active',
      bio: 'Professional barber specializing in beard grooming and premium men\'s styling.',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      first_name: 'David',
      last_name: 'Wilson',
      email: 'david.wilson@example.com',
      phone: '+1234567893',
      password: customerPassword,
      role: 'customer',
      status: 'active',
      bio: 'Regular customer who values quality haircuts and professional service.',
      preferences: JSON.stringify({
        preferred_barber: 2,
        notification_preferences: {
          email: true,
          sms: true,
          reminder_hours: 24
        }
      }),
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      first_name: 'Sarah',
      last_name: 'Brown',
      email: 'sarah.brown@example.com',
      phone: '+1234567894',
      password: customerPassword,
      role: 'customer',
      status: 'active',
      preferences: JSON.stringify({
        notification_preferences: {
          email: true,
          sms: false,
          reminder_hours: 48
        }
      }),
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};