const express = require("express");
const routes = express.Router();
const { sentOtpPhoneAndEmail, rescheduleAppointment, cancelAppointment,
     getCancelAppointment, getUpcomingAppointment,
      getCompletedAppointment , generateSloats, bookAppointment,
      salonOffers,todaysAppointments,verifyAppointment,walkinAppointment,getSalonClients} = require("../controllers/appointmentController");
const { verifyUser, verifySalon,verifyAny} = require("../middlewares/jwtVerification");
routes.route("/onsite-payment").get(verifyUser, sentOtpPhoneAndEmail);
routes.route("/cancel/:id").patch(cancelAppointment);
routes.route("/reschedule/:id").patch(rescheduleAppointment);
routes.route("/cancel_list").get(verifyUser,getCancelAppointment);
routes.route("/upcoming_list").get(verifyUser,getUpcomingAppointment);
routes.route("/completed_list").get(verifyUser,getCompletedAppointment);
//Generate Sloats
routes.route('/generateSloats').post(verifyAny,generateSloats);
//Create Appointmet 
routes.route('/bookAppointment').post(verifyUser , bookAppointment);
//salon offers
routes.route('/salon/offers').post(verifyUser , salonOffers);
//todays Appointments
routes.route('/todaysAppointments').get( todaysAppointments);
//verify Appointment
routes.route('/verifyAppointment/:id').post(verifySalon , verifyAppointment);
//view Account Details
routes.route('/walkinAppointment').post(verifySalon , walkinAppointment);
//get Salon clients
routes.route('/getSalonClients').get(verifySalon , getSalonClients);

module.exports = routes;