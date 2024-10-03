const express = require("express")
const routes = express.Router();

// Import holiday controller methods
const { getHolidays, saveHolidays, addHoliday, updateHoliday, deleteHoliday } = require("../controllers/holidayController");

// Define routes for holiday-related operations
routes.get("/:salonId/getHolidays", getHolidays); // Route to get holidays for a salon
routes.post("/:salonId/saveHolidays", saveHolidays); // Route to save holidays for a salon
routes.post("/:salonId/addHoliday", addHoliday); // Route to add a holiday for a salon
routes.patch("/:salonId/updateHoliday", updateHoliday); // Route to update a holiday for a salon
routes.delete("/:salonId/deleteHoliday", deleteHoliday); // Route to delete a holiday for a salon

module.exports = routes;
