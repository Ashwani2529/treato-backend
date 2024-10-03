const express = require("express")
const routes = express.Router();

// Import sale analytics controller methods
const { 
    getAppointmentandAmtPerDay,
    getSalonGeneralAnalytics,
    recentActivity,
    upcomingAppointments,
    topServicesWithinNDays,
    getStylistSalesAnalysis
} = require("../controllers/saleAnalyticsCtrl");

// Import middleware for JWT verification
const { verifySalon } = require("../middlewares/jwtVerification");

// Define routes for sale analytics operations
routes.route("/getAppointmentandAmtPerDay").get(verifySalon, getAppointmentandAmtPerDay); // Route to get appointment count and amount per day
routes.route("/getSalonGeneralAnalytics").get(verifySalon, getSalonGeneralAnalytics); // Route to get general analytics for salon
routes.route("/recentActivity").get(verifySalon, recentActivity); // Route to get recent activity for salon
routes.route("/upcomingAppointments").get(verifySalon, upcomingAppointments); // Route to get upcoming appointments for salon
routes.route("/topServicesWithinNDays").get(verifySalon, topServicesWithinNDays); // Route to get top services within N days for salon
routes.route("/getStylistSalesAnalysis").get(verifySalon, getStylistSalesAnalysis); // Route to get stylist sales analysis for salon

module.exports = routes;
