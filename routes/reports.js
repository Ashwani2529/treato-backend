const express = require("express");
const routes = express.Router();
const { appointmentsByDays,clientsReport,calenderReport,contactUs } = require("../controllers/reportController");
const { verifySalon} = require("../middlewares/jwtVerification");

//get appointments by days
routes.route("/appointmentsByDays").get(verifySalon,appointmentsByDays);
//get clients report
routes.route("/clientsReport").get(verifySalon,clientsReport);
//get calender report
routes.route("/calenderReport/:date").get(verifySalon,calenderReport);
//save contact us form
routes.route("/contactUs").post(contactUs);

module.exports = routes;