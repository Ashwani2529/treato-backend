const mongoose = require("mongoose");

const fundAccountSchema = new mongoose.Schema({
  id: String,
  contact_id: String,
  contact: {
    name: String,
    email: String,
  },
  account_type: String,
  bank_account: {
    ifsc: String,
    bank_name: String,
    name: String,
    account_number: String,
  },
  active: Boolean,
});

const paymentSchema = new mongoose.Schema(
  {
    id: String,
    salon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "salons",
    },
    fund_account_id: String,
    fund_account: fundAccountSchema,
    amount: {
      type: Number,
      required: true,
    },
    status: String,
    mode: String,
    narration: String,
    created_at: Number,
    merchant_id: String,
    orderTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const paymentModel = mongoose.model("payment", paymentSchema);

module.exports = {
  paymentModel,
};
