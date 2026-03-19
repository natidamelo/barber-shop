/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('inventory', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('sku', 100).unique();
    table.string('category', 100);
    table.string('brand', 100);
    table.decimal('cost_price', 8, 2);
    table.decimal('selling_price', 8, 2);
    table.integer('current_stock').defaultTo(0);
    table.integer('minimum_stock').defaultTo(0);
    table.integer('maximum_stock').defaultTo(1000);
    table.string('unit', 50).defaultTo('piece').comment('unit of measurement');
    table.date('expiry_date').nullable();
    table.string('supplier', 255);
    table.string('supplier_contact', 255);
    table.string('image_url', 500);
    table.boolean('is_active').defaultTo(true);
    table.text('notes');
    table.timestamps(true, true);

    // Indexes
    table.index('category');
    table.index('current_stock');
    table.index('minimum_stock');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('inventory');
};