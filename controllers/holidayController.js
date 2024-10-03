const express = require("express");
const axios = require("axios");
const holidayModel = require("../models/holidayModel");
const salonsModel = require("../models/salonsModel");
const { ErrorHandler } = require("../utills/errorHandler");
const CALENDARIFIC_API_KEY = "LgGYkFWrpX8bLM0h9v49pANNhYWOxJKD";

const getHolidays = async (req, res, next) => {
  try {
    const salonId = req.params.salonId;
    if (!salonId) {
      throw new ErrorHandler("Salon ID is required", 400);
    }
    const holidays = await holidayModel.findOne({ salon: salonId });
    if (!holidays) {
      throw new ErrorHandler("Holidays not found", 404);
    }
    res.json({ message: "List of Holidays", AllHolidays: holidays });
  } catch (error) {
    next(error);
  }
};
// POST endpoint to fetch and save holidays for a salon
const saveHolidays = async (req, res, next) => {
  try {
    const salonId = req.params.salonId;
    if (!salonId) {
      throw new ErrorHandler("Salon ID is required", 400);
    }
    // Check if a document with the given salonId already exists
    let existingHolidays = await holidayModel.findOne({ salon: salonId });

    // If no document exists, create a new one
    if (!existingHolidays) {
      existingHolidays = new holidayModel({
        salon: salonId,
        holidays: [],
      });
    }

    // Make a request to the Calendarific API
    const response = await axios.get(
      `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=IN&year=2024`
    );

    // Extract holidays from the response and transform them to fit the Mongoose model
    const holidaysData = response.data.response.holidays.map((holiday) => ({
      event: holiday.name,
      date: holiday.date.iso.toISOString().slice(0, 10),
      status: "closed",
    }));

    // Check if the holiday with the same date already exists in the array
    holidaysData.forEach((newHoliday) => {
      const existing = existingHolidays.holidays.find(
        (exist) => exist.date.toString() === newHoliday.date.toString()
      );

      // If the holiday doesn't exist, add it to the array
      if (!existing) {
        existingHolidays.holidays.push(newHoliday);
      }
    });

    await existingHolidays.save();
    res.json({ message: "Holidays saved successfully" });
  } catch (error) {
    next(error);
  }
};

const addHoliday = async (req, res, next) => {
  try {
    const salonId = req.params.salonId;
    if (!salonId) {
      throw new ErrorHandler("Salon ID is required", 400);
    }
    const { event, date, status } = req.body;
    if (!event || !date || !status) {
      throw new ErrorHandler("All fields are required", 400);
    }
    // Check if a document with the given salonId already exists
    const existingHolidays = await holidayModel.findOne({ salon: salonId });
    if (!existingHolidays) {
      throw new ErrorHandler("Holidays not found", 404);
    }
    const newHoliday = {
      event,
      date,
      status,
    };
    existingHolidays.holidays.push(newHoliday);
    await existingHolidays.save();
    res.json({ message: "Holiday added successfully", holiday: newHoliday });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateHoliday = async (req, res, next) => {
  try {
    const salonId = req.params.salonId;
    if (!salonId) {
      throw new ErrorHandler("Salon ID is required", 400);
    }
    const updatedHoliday = req.body;
    if (!updatedHoliday) {
      throw new ErrorHandler("Updated Holidays data is required", 400);
    }
    // Create an array to store bulk update operations
    const bulkOperations = [];

    // Construct bulk update operations for each updated holiday
    updatedHoliday.forEach((holiday) => {
      const filter = { salon: salonId, "holidays.date": holiday.date };
      const update = { $set: { "holidays.$": holiday } };
      bulkOperations.push({
        updateOne: { filter, update },
      });
    });

    // Execute bulk update operations
    const result = await holidayModel.bulkWrite(bulkOperations);

    // Check if any modifications were made
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "No holidays updated" });
    }

    res.json({ message: "Holidays updated successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteHoliday = async (req, res, next) => {
  try {
    const salonId = req.params.salonId;
    if (!salonId) {
      throw new ErrorHandler("Salon ID is required", 400);
    }
    const { date } = req.body;
    if (!date) {
      throw new ErrorHandler("Date is required", 400);
    }

    // Find the document that matches the salonId and has a holiday with the specified date
    const existingHoliday = await holidayModel.findOne({
      salon: salonId,
      "holidays.date": date,
    });

    if (!existingHoliday) {
      throw new ErrorHandler("Holiday not found", 404);
    }

    // Remove the holiday with the specified date from the array
    existingHoliday.holidays.pull({ date: date });
    await existingHoliday.save();

    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHolidays,
  saveHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
};
