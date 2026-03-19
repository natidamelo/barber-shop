/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('services').del();
  
  // Insert seed entries
  await knex('services').insert([
    {
      id: 1,
      name: 'Classic Men\'s Haircut',
      description: 'Traditional haircut with scissors and clipper work. Includes consultation, wash, cut, and styling.',
      price: 750.00, // ETB pricing
      duration: 45,
      category: 'Haircuts',
      is_active: true,
      sort_order: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Beard Trim & Shape',
      description: 'Professional beard trimming and shaping service. Includes hot towel treatment and moisturizing.',
      price: 20.00,
      duration: 30,
      category: 'Beard Services',
      is_active: true,
      sort_order: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Premium Cut & Wash',
      description: 'Deluxe haircut service with premium shampoo, conditioning treatment, precision cutting, and styling.',
      price: 1350.00, // ETB pricing
      duration: 60,
      category: 'Premium Services',
      is_active: true,
      sort_order: 3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Buzz Cut',
      description: 'Quick and efficient buzz cut with clipper work. Perfect for low-maintenance styles.',
      price: 450.00, // ETB pricing
      duration: 20,
      category: 'Haircuts',
      is_active: true,
      sort_order: 4,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'Hot Towel Shave',
      description: 'Traditional wet shave with hot towel preparation, premium shaving cream, and aftershave treatment.',
      price: 1050.00, // ETB pricing
      duration: 45,
      category: 'Shave Services',
      is_active: true,
      sort_order: 5,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'Fade Cut',
      description: 'Modern fade haircut with precise blending and contemporary styling techniques.',
      price: 900.00, // ETB pricing
      duration: 50,
      category: 'Haircuts',
      is_active: true,
      sort_order: 6,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 7,
      name: 'Mustache Trim',
      description: 'Professional mustache grooming and shaping service.',
      price: 360.00, // ETB pricing
      duration: 15,
      category: 'Beard Services',
      is_active: true,
      sort_order: 7,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 8,
      name: 'Hair Wash & Style',
      description: 'Professional wash and styling service without cutting.',
      price: 540.00, // ETB pricing
      duration: 30,
      category: 'Styling',
      is_active: true,
      sort_order: 8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 9,
      name: 'Complete Grooming Package',
      description: 'Full service package including haircut, beard trim, hot towel shave, and styling.',
      price: 2250.00, // ETB pricing
      duration: 90,
      category: 'Premium Services',
      is_active: true,
      sort_order: 9,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 10,
      name: 'Senior Cut (65+)',
      description: 'Special pricing for senior citizens. Includes consultation, wash, cut, and styling.',
      price: 600.00, // ETB pricing
      duration: 45,
      category: 'Special Offers',
      is_active: true,
      sort_order: 10,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};