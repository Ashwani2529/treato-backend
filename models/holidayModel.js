const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  event: { type: String, required: true },
  date: { type: String, required: true ,unique:true},
  status: { type: String, enum: ['open', 'closed'], default: 'closed' },
});

const salonSchema = new mongoose.Schema({
  salon: { type: mongoose.Schema.Types.ObjectId, ref: 'salons', required: true },
  holidays: [holidaySchema],
});

const holidayModel = mongoose.model('holidays', salonSchema);

module.exports = holidayModel;