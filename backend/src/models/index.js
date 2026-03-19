// Export all models
const User = require('./User');
const Service = require('./Service');
const Appointment = require('./Appointment');
const Inventory = require('./Inventory');
const InventoryTransaction = require('./InventoryTransaction');
const Review = require('./Review');
const StaffSchedule = require('./StaffSchedule');
const OperatingExpense = require('./OperatingExpense');
const Settings = require('./Settings');
const BarberTip = require('./BarberTip');
const License = require('./License');

module.exports = {
  User,
  Service,
  Appointment,
  Inventory,
  InventoryTransaction,
  Review,
  StaffSchedule,
  OperatingExpense,
  Settings,
  BarberTip,
  License
};