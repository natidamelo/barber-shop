/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('inventory_transactions', function(table) {
    table.increments('id').primary();
    table.integer('inventory_id').unsigned().notNullable();
    table.integer('user_id').unsigned().notNullable().comment('User who performed the transaction');
    table.enum('transaction_type', ['purchase', 'usage', 'adjustment', 'waste', 'return']).notNullable();
    table.integer('quantity').notNullable();
    table.integer('previous_stock').notNullable();
    table.integer('new_stock').notNullable();
    table.decimal('unit_cost', 8, 2).nullable();
    table.decimal('total_cost', 8, 2).nullable();
    table.string('reference_number', 100).nullable().comment('Invoice or reference number');
    table.text('notes');
    table.date('transaction_date').notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('inventory_id').references('id').inTable('inventory').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('inventory_id');
    table.index('transaction_type');
    table.index('transaction_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('inventory_transactions');
};