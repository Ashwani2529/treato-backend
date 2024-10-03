const express = require('express');
const routes = express.Router();

// Import order controller methods
const {
    createOrder,
    getOrderByAppointmentId,
    paySalon,
    refundToUser,
    getAllOrdersBySalonID,
    getAllPayoutsBySalonID,
    getTransactionsOfaDay,
    paymentVerify
} = require('../controllers/orderController');

// Define routes for order-related operations
routes.route('/createOrder/:appointmentId').post(createOrder); // Route to create an order for a given appointment
routes.route('/paymentVerify').post(paymentVerify); // Route to verify payment
routes.route('/getOrderByAppointmentId/:appointmentId').post(getOrderByAppointmentId); // Route to get order details by appointment ID
routes.route('/paySalon').post(paySalon); // Route to pay salon
routes.route('/refundToUser').post(refundToUser); // Route to refund to user
routes.route('/getAllOrdersBySalonID/:salonId').get(getAllOrdersBySalonID); // Route to get all orders by salon ID
routes.route('/getAllPayoutsBySalonID/:salonId').get(getAllPayoutsBySalonID); // Route to get all payouts by salon ID
routes.route('/getTransactionsOfaDay').get(getTransactionsOfaDay); // Route to get transactions of a day

module.exports = routes;
