/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('staff_schedules', function(table) {
    table.increments('id').primary();
    table.integer('staff_id').unsigned().notNullable();
    table.date('date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.time('break_start').nullable();
    table.time('break_end').nullable();
    table.boolean('is_available').defaultTo(true);
    table.text('notes');
    table.enum('schedule_type', ['regular', 'overtime', 'holiday']).defaultTo('regular');
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('staff_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('staff_id');
    table.index('date');
    table.unique(['staff_id', 'date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('staff_schedules');
};