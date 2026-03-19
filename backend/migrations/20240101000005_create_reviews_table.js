/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('reviews', function(table) {
    table.increments('id').primary();
    table.integer('customer_id').unsigned().notNullable();
    table.integer('barber_id').unsigned().notNullable();
    table.integer('appointment_id').unsigned().nullable();
    table.integer('service_id').unsigned().notNullable();
    table.integer('rating').notNullable().checkBetween([1, 5]);
    table.text('comment');
    table.boolean('is_verified').defaultTo(false);
    table.boolean('is_published').defaultTo(true);
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('customer_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('barber_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('appointment_id').references('id').inTable('appointments').onDelete('SET NULL');
    table.foreign('service_id').references('id').inTable('services').onDelete('CASCADE');

    // Indexes
    table.index('barber_id');
    table.index('service_id');
    table.index('rating');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('reviews');
};