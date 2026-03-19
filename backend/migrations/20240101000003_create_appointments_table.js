/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('appointments', function(table) {
    table.increments('id').primary();
    table.integer('customer_id').unsigned().notNullable();
    table.integer('barber_id').unsigned().notNullable();
    table.integer('service_id').unsigned().notNullable();
    table.datetime('appointment_date').notNullable();
    table.datetime('end_time').notNullable();
    table.enum('status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).defaultTo('scheduled');
    table.text('notes');
    table.text('customer_notes').comment('Notes from customer');
    table.text('barber_notes').comment('Notes from barber');
    table.decimal('price', 8, 2);
    table.enum('payment_status', ['pending', 'paid', 'partially_paid', 'refunded']).defaultTo('pending');
    table.enum('payment_method', ['cash', 'card', 'online', 'other']).nullable();
    table.datetime('reminder_sent_at').nullable();
    table.datetime('confirmation_sent_at').nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('customer_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('barber_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('service_id').references('id').inTable('services').onDelete('CASCADE');

    // Indexes for better performance
    table.index('customer_id');
    table.index('barber_id');
    table.index('appointment_date');
    table.index('status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('appointments');
};