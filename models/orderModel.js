const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointments",
    },
    salon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "salons",
    },
    order_id: {
      type: String,
    },
    amount: {
      type: Number,
      require: true,
    },
    Payment_method: {
      type: String,
      require: true,
    },
    amount_paid: {
      type: Number,
    },
    currency: {
      type: String,
    },
    notes: {
      type: Object,
    },
    orderTime: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
    },
  },
  { timestamps: true }
);
const orderModel = new mongoose.model("order", orderSchema);
module.exports = {
  orderModel,
};
