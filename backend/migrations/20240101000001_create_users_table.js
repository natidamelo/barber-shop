/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('phone', 20);
    table.string('password', 255).notNullable();
    table.enum('role', ['admin', 'barber', 'customer']).defaultTo('customer');
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.string('profile_image', 500);
    table.text('bio');
    table.json('preferences');
    table.timestamp('email_verified_at').nullable();
    table.string('email_verification_token', 255).nullable();
    table.string('reset_password_token', 255).nullable();
    table.timestamp('reset_password_expires').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};