const { salonsModel } = require("../models/salonsModel");
const { serviceModel } = require("../models/serviceModel");
const { stylistModel } = require("../models/stylistModel");
const { ErrorHandler } = require("../utills/errorHandler");
const mongoose = require("mongoose");
const { getTenure } = require("./utilityFunctions/checkForValidStylist");
const {
  createTimeSlots,
  convertTo24HourFormat,
  generateSlots,
} = require("./utilityFunctions/createTimeSlots");

const createStylist = async (req, res, next) => {
  try {
    const salon = req?.salon;
    if (!req.file) {
      throw new ErrorHandler("No Stylist Image given!!", 400);
    }
    let {
      services,
      stylist_name,
      stylist_service,
      stylist_address,
      service_time,
      stylist_number,
    } = req.body;
    if (
      !services ||
      !stylist_name ||
      !stylist_service ||
      !stylist_address ||
      !stylist_number
    ) {
      throw new ErrorHandler("All fields are required", 400);
    }
    // Parse services as JSON if it's a string
    if (typeof services === "string") {
      services = JSON.parse(services);
    }

    const servicesIdsArray = Array.isArray(services)
      ? services.map((service) => new mongoose.Types.ObjectId(service))
      : [];

    //generate time_for_service and time_of_service
    const slotTime = salon.salots_gap;
    const workingHours = salon.working_hours;
    const slotsPerDay = generateSlots(slotTime, workingHours);
    if (!slotsPerDay) {
      throw new ErrorHandler("Unable to generate slots per day", 400);
    }
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    let timeForService = [];
    let timeOfService = [];
    for (
      let date = new Date();
      date <= new Date(new Date().setDate(new Date().getDate() + 30));
      date.setDate(date.getDate() + 1)
    ) {
      let dateForService = date.toISOString().slice(0, 10);
      let dayOfWeek = date.getDay();

      // Find slots for the current day
      let slotsOfDay = slotsPerDay.find(
        (day) => day.day === daysOfWeek[dayOfWeek]
      );
      let Slots = slotsOfDay ? slotsOfDay.slots : [];
      // Construct the shift object

      let shift = { start_time: Slots[0], end_time: Slots[Slots.length - 1] };
      if (daysOfWeek[dayOfWeek]) {
        if (Slots.length < 1) {
          timeForService.push({
            date: dateForService,
            isClosed: true,
            time_slots: [],
            shifts: [],
          });
          continue;
        }
        //convert each slot of Slots into object
        Slots = Slots.map((slot, index) => {
          return { slot };
        });

        timeForService.push({
          date: dateForService,
          time_slots: Slots,
          shifts: [shift],
        });
        timeOfService.push({
          day: daysOfWeek[dayOfWeek],
          slots: [shift],
        });
      } else {
        timeForService.push({
          date: dateForService,
          isClosed: true,
          time_slots: [],
          shifts: [],
        });
      }
    }

    // Create a new stylist document
    let newStylist = new stylistModel({
      services: servicesIdsArray,
      stylist_name,
      stylist_service,
      stylist_address,
      service_time,
      stylist_number,
      time_of_service: timeOfService,
      time_for_service: timeForService,
    });

    // If no image in req.file return error in response

    //add stylist Image to database
    newStylist.stylist_Img = {
      public_url: req.file.location,
      key: req.file.key,
    };
    // Save the new stylist to the database
    await newStylist.save();
    salon.stylists.push(newStylist._id);
    salon.save();

    return res.status(201).json({
      success: true,
      message: "Stylist Created Successfully",
      data: newStylist, // Optionally return the created stylist
    });
  } catch (error) {
    next(error);
  }
};

// const addLeave

const getOneStylist = async (req, res, next) => {
  try {
    const stylist = await stylistModel.findOne({ _id: req.params.id });

    if (!stylist) {
      throw new ErrorHandler("No Stylist Found");
    }

    return res.send({
      success: true,
      data: stylist,
    });
  } catch (err) {
    next(err);
  }
};

const removeStylist = async (req, res, next) => {
  const salonId = req?.salon._id;
  try {
    const stylistId = req.params.stylistId;
    const Stylist = await stylistModel.findById(stylistId);
    if (!Stylist) {
      throw new ErrorHandler("Stylist not found", 404);
    }
    Stylist.deleted = new Date().toISOString().slice(0, 10);
    await Stylist.save();
    const stylist = await salonsModel.findOneAndUpdate(
      { _id: salonId }, // Query: Find the document where _id matches salonId
      { $pull: { stylists: stylistId } }, // Update: Remove the stylistId from the stylists array
      { new: true } // Options: Return the updated document after the update operation
    );
    if (!stylist) {
      throw new ErrorHandler("Stylist not found", 404);
    }
    return res.status(200).json({
      success: true,
      message: "Stylist removed from salon successfully",
      data: Stylist,
    });
  } catch (error) {
    next(error);
  }
};

const deleteStylist = async (req, res, next) => {
  try {
    const stylist = await stylistModel.findByIdAndDelete({
      _id: req.params.id,
    });

    if (!stylist) {
      throw new ErrorHandler("No Stylist Found");
    }

    return res.json({
      success: true,
      msg: "Stylist Deleted Successfully",
      data: stylist,
    });
  } catch (err) {
    next(err);
  }
};

const listAllStylist = async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const options = {
      page: page,
      limit: req.query.limit || 20,
    };

    const stylist = await stylistModel.paginate({}, options);

    if (!stylist) {
      throw new ErrorHandler("No Stylist Found");
    }

    return res.json({
      success: true,
      data: stylist,
    });
  } catch (err) {
    next(err);
  }
};

const updateStylist = async (req, res, next) => {
  try {
    const stylistId = req.params.id;
    let {
      services,
      stylist_name,
      stylist_service,
      stylist_address,
      time_of_service,
      time_for_service,
      stylist_number,
      rating,
      reviews,
    } = req.body;
    // Validate if services are provided and convert them to ObjectIds

    // Parse services as JSON if it's a string
    if (typeof services === "string") {
      services = JSON.parse(services);
    }

    const servicesIdsArray = Array.isArray(services)
      ? services.map((service) => new mongoose.Types.ObjectId(service))
      : [];

    // Create an object with only the fields that need to be updated
    const updateFields = {};

    if (services) updateFields.services = servicesIdsArray;
    if (stylist_name) updateFields.stylist_name = stylist_name;
    if (stylist_service) updateFields.stylist_service = stylist_service;
    if (stylist_address) updateFields.stylist_address = stylist_address;
    if (time_of_service) updateFields.time_of_service = time_of_service;
    if (time_for_service) updateFields.time_for_service = time_for_service;
    if (stylist_number) updateFields.stylist_number = stylist_number;
    if (rating) updateFields.rating = rating;
    if (reviews) updateFields.reviews = reviews;

    // If req.file is provided, update stylist image
    if (req.file) {
      updateFields.stylist_Img = {
        public_url: req.file.location,
        key: req.file.key,
      };
    }

    // Update the stylist by ID with the specified fields, using runValidators: true to run validators on update
    const updatedStylist = await stylistModel.findByIdAndUpdate(
      stylistId,
      updateFields,
      {
        new: true, // Return the updated document
        runValidators: true, // Run validators on update
      }
    );

    if (!updatedStylist) {
      throw new ErrorHandler("Stylist not found", 404);
    }

    return res.status(200).json({
      success: true,
      message: "Stylist Updated Successfully",
      data: updatedStylist,
    });
  } catch (error) {
    next(error);
  }
};

const editEmployeeSchedule = async (req, res, next) => {
  const salon = req?.salon;
  try {
    const { scheduleStart, scheduleEnd, stylistId, dayWiseShift } = req.body;
    if (!stylistId) {
      throw new ErrorHandler("Stylist Id is required", 400);
    }
    if (!dayWiseShift || dayWiseShift.length < 1) {
      throw new ErrorHandler("Day-wise shifts are required", 400);
    }
    // Ensure scheduleEnd is set
    if (!scheduleEnd) {
      scheduleEnd = new Date(scheduleStart);
      scheduleEnd.setDate(scheduleEnd.getDate() + 30);
    }

    const slotTime = salon.salots_gap;
    const workingHours = salon.working_hours;
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    // Create a day-wise mapping of shifts for easy lookup
    const dayWiseShiftMap = new Map(
      dayWiseShift
        .filter(({ isOnLeave }) => !isOnLeave)
        .map(({ day, slots }) => [daysOfWeek.indexOf(day), slots])
    );

    const leaveDays = dayWiseShift
      .filter(({ isOnLeave }) => isOnLeave)
      .map(({ day }) => daysOfWeek.indexOf(day));
    // Generate and update time_for_service for each date
    for (
      let date = new Date(scheduleStart);
      date <= new Date(scheduleEnd);
      date.setDate(date.getDate() + 1)
    ) {
      const dateForService = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getDay();
      if (leaveDays.includes(dayOfWeek)) {
        // Day is closed, set isOnLeave to true for all time slots
        await stylistModel.findOneAndUpdate(
          { _id: stylistId, "time_for_service.date": dateForService },
          {
            $set: {
              "time_for_service.$.isOnLeave": true,
              "time_for_service.$.time_slots": [],
              "time_for_service.$.shifts": [],
            },
          }
        );
      } else {
        let timeSlots = createTimeSlots(slotTime, workingHours, dateForService);
        if (!timeSlots) {
          throw new ErrorHandler("Unable to create time slots", 400);
        }
        timeSlots = convertTo24HourFormat(timeSlots);
        if (timeSlots.length < 1) {
          //mark isClosed true for the day
          await stylistModel.findOneAndUpdate(
            { _id: stylistId, "time_for_service.date": dateForService },
            {
              $set: {
                "time_for_service.$.isClosed": true,
                time_of_service: dayWiseShift,
                "time_for_service.$.time_slots": [],
                "time_for_service.$.shifts": [],
              },
            }
          );
          continue;
        }
        const shifts = dayWiseShiftMap.get(dayOfWeek) || [];
        //store all booked slots to later make them isBooked true
        const bookedSlots = [];
        const stylist = await stylistModel.findOne({ _id: stylistId });
        //now find specific time_for_service and update it
        const timeForService = stylist.time_for_service.find(
          (tfs) => tfs.date === dateForService
        );
        if (!timeForService) {
          throw new ErrorHandler("Time for service not found", 404);
        }
        //store all booked slots to later make them isBooked true
        if (timeForService && timeForService.time_slots.length > 0) {
          timeForService.time_slots.forEach((slot) => {
            if (slot.isBooked) {
              bookedSlots.push(slot.slot);
            }
          });
        }

        const filteredSlots = timeSlots.filter((slot) =>
          shifts.some(
            ({ start_time, end_time }) => slot >= start_time && slot <= end_time
          )
        );
        if (!filteredSlots) {
          throw new ErrorHandler(
            "Unable to filter slots based on start_time and end_time",
            400
          );
        }
        //here we will convert filteredSlots into object and check if it is booked or not
        const updatedTimeSlots = filteredSlots.map((slot) => {
          return { slot, isBooked: bookedSlots.includes(slot) };
        });
        if (!updatedTimeSlots) {
          throw new ErrorHandler("Unable to update time slots", 400);
        }
        await stylistModel.findOneAndUpdate(
          { _id: stylistId, "time_for_service.date": dateForService },
          {
            $set: {
              "time_for_service.$.time_slots": updatedTimeSlots,
              "time_for_service.$.shifts": shifts,
              "time_for_service.$.isOnLeave": false,
              "time_for_service.$.isClosed": false,
              "time_for_service.$.isOnPartialLeave": false,
            },
          }
        );
      }
    }
    return res.status(200).json({
      success: true,
      message: "Stylist Schedule Updated Successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getShiftsByDay = async (req, res, next) => {
  try {
    const { stylistId, date } = req.query;
    const stylist = await stylistModel.findOne({ _id: stylistId });
    if (!stylist) {
      throw new ErrorHandler("Stylist not found", 404);
    }
    const timeForService = stylist.time_for_service.find(
      (tfs) => tfs.date === date
    );
    if (!timeForService) {
      throw new ErrorHandler("Time for service not found", 404);
    }
    return res.status(200).json({
      success: true,
      data: timeForService.shifts,
    });
  } catch (error) {
    next(error);
  }
};

const addLeave = async (req, res, next) => {
  try {
    const { stylistId, startDate, endDate, fullDay, start_time, end_time } =
      req.body;
    const stylist = await stylistModel.findById(stylistId);
    if (!stylist) {
      throw new ErrorHandler("Stylist not found", 404);
    }

    if (!fullDay) {
      // Check if start_time and end_time are provided for partial leave
      if (!start_time || !end_time) {
        throw new ErrorHandler(
          "Start and End time are required for partial leave",
          400
        );
      }

      for (
        let date = new Date(startDate);
        date <= new Date(endDate);
        date.setDate(date.getDate() + 1)
      ) {
        const dateForService = date.toISOString().slice(0, 10);
        const tfsIndex = stylist.time_for_service.findIndex(
          (tfs) => tfs.date === dateForService
        );
        if (tfsIndex !== -1) {
          const slots = stylist.time_for_service[tfsIndex].time_slots;
          if (!slots) {
            throw new ErrorHandler("Time slots not found", 404);
          }
          stylist.time_for_service[tfsIndex].time_slots = slots.filter(
            (slot) => slot.slot < start_time || slot.slot > end_time
          );
          stylist.time_for_service[tfsIndex].isOnPartialLeave = true;
        }
      }
    } else {
      // Update documents for full day leave
      for (
        let date = new Date(startDate);
        date <= new Date(endDate);
        date.setDate(date.getDate() + 1)
      ) {
        const dateForService = date.toISOString().slice(0, 10);
        const tfsIndex = stylist.time_for_service.findIndex(
          (tfs) => tfs.date === dateForService
        );
        if (tfsIndex !== -1) {
          stylist.time_for_service[tfsIndex].time_slots = [];
          stylist.time_for_service[tfsIndex].shifts = [];
          stylist.time_for_service[tfsIndex].isOnLeave = true;
        }
      }
    }

    await stylist.save();

    return res.status(200).json({
      success: true,
      message: fullDay
        ? "Full Day Leave Added Successfully"
        : "Partial Leave Added Successfully",
      data: null, // No need to return data here
    });
  } catch (error) {
    next(error);
  }
};

const editShift = async (req, res, next) => {
  try {
    const { stylistId, date, newShifts } = req.body;
    const salon = req?.salon;
    const slotTime = salon.salots_gap;
    const workingHours = salon.working_hours;
    if (!salon || !slotTime || !workingHours) {
      throw new ErrorHandler("Salon details not found", 404);
    }
    // Find the stylist
    const stylist = await stylistModel.findOne({
      _id: stylistId,
      "time_for_service.date": date,
    });

    if (!stylist) {
      throw new ErrorHandler("Stylist or date not found", 404);
    }

    const timeForService = stylist.time_for_service.find(
      (tfs) => tfs.date === date
    );

    if (!timeForService) {
      throw new ErrorHandler("Time for service not found", 404);
    }

    // Generate time slots for the given date
    let timeSlots = createTimeSlots(slotTime, workingHours, date);
    if (!timeSlots) {
      throw new ErrorHandler("Unable to create time slots", 400);
    }
    timeSlots = convertTo24HourFormat(timeSlots);

    // Filter time slots within newShifts range
    const newShiftSlots = newShifts.reduce((acc, shift) => {
      const { start_time, end_time } = shift;
      const filteredSlots = timeSlots.filter(
        (slot) => slot >= start_time && slot <= end_time
      );
      return [...acc, ...filteredSlots];
    }, []);
    if (!newShiftSlots) {
      throw new ErrorHandler(
        "Unable to filter slots based on start_time and end_time",
        400
      );
    }
    // Remove slots from existing slots that are not in newly generated slots
    const bookedSlots = timeForService.time_slots.filter(
      (slot) => slot.isBooked
    );
    bookedSlots.forEach((bookedSlot) => {
      if (!newShiftSlots.some((newSlot) => newSlot === bookedSlot.slot)) {
        throw new ErrorHandler("Booked slots cannot be removed", 400);
      }
    });
    //convert each slot of newShiftSlots into object
    newShiftSlots.forEach((slot, index) => {
      newShiftSlots[index] = { slot };
    });
    //mark bookedSlots isBooked true in newShiftSlots
    bookedSlots.forEach((bookedSlot) => {
      const index = newShiftSlots.findIndex(
        (slot) => slot.slot === bookedSlot.slot
      );
      newShiftSlots[index].isBooked = true;
    });
    // Update the stylist document with the new shifts and updated slots
    const updatedStylist = await stylistModel.findOneAndUpdate(
      { _id: stylistId, "time_for_service.date": date },
      {
        $set: {
          "time_for_service.$.time_slots": newShiftSlots,
          "time_for_service.$.shifts": newShifts,
        },
      },
      { new: true }
    );

    if (!updatedStylist) {
      throw new ErrorHandler("Stylist not found", 404);
    }

    res.json({ message: "Shifts and time slots updated successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteShift = async (req, res, next) => {
  try {
    const { stylistId, date, shiftId } = req.query;

    const stylist = await stylistModel.findOne({
      _id: stylistId,
      "time_for_service.date": date,
    });
    if (!stylist) {
     throw new ErrorHandler("Stylist not found", 404);
    }

    const timeForService = stylist.time_for_service.find(
      (tfs) => tfs.date === date
    );

    if (!timeForService) {
      throw new ErrorHandler("Time for service not found", 404);
    }
    const shiftToRemove = timeForService.shifts.find(
      (shift) => shift._id.toString() === shiftId
    );

    if (!shiftToRemove) {
      throw new ErrorHandler("Shift not found", 404);
    }

    // Remove the shift from the shifts array
    timeForService.shifts = timeForService.shifts.filter(
      (shift) => shift._id.toString() !== shiftId
    );

    // Remove time slots that fall within the shift's start and end times
    timeForService.time_slots = timeForService.time_slots.filter(
      (slot) =>
        slot.slot < shiftToRemove.start_time ||
        slot.slot > shiftToRemove.end_time
    );

    await stylist.save();

    res.json({
      message: "Shift and time slots removed successfully",
      shiftToRemove,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
//list all stylist of a salon
const teamMembers = async (req, res, next) => {
  const salonId = req?.salon._id;
  try {
    const allStylists = await salonsModel
      .findById(salonId)
      .select("stylists")
      .exec();
    const stylistIds = allStylists.stylists.map((stylist) => stylist._id);
    if (stylistIds.length < 1) {
      throw new ErrorHandler("No stylists found", 404);
    }
    const stylists = await stylistModel.aggregate([
      // Filter stylists based on the salonId and the stylists' ObjectIDs
      { $match: { _id: { $in: stylistIds } } },

      // Lookup appointments for the current day
      {
        $lookup: {
          from: "appointments",
          let: { selectedStylistId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$selectedStylistId", "$$selectedStylistId"] },
                    { $eq: ["$status", "upcoming"] },
                    {
                      $eq: [
                        "$dateforService",
                        new Date().toISOString().slice(0, 10),
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "appointments",
        },
      },
      {
        $group: {
          _id: "$_id",
          stylist_name: { $first: "$stylist_name" },
          stylist_Img: { $first: "$stylist_Img" },
          stylist_service: { $first: "$stylist_service" },
          stylist_address: { $first: "$stylist_address" },
          stylist_number: { $first: "$stylist_number" },
          rating: { $first: "$rating" },
          tenure: { $first: "$created" },
          appointments: { $sum: { $size: "$appointments" } },
        },
      }, // Project the desired fields
      {
        $project: {
          _id: 1,
          stylist_name: 1,
          stylist_Img: 1,
          stylist_service: 1,
          stylist_address: 1,
          stylist_number: 1,
          rating: 1,
          tenure: 1,
          appointments: 1,
        },
      },
    ]);

    for (let i = 0; i < stylists.length; i++) {
      stylists[i].tenure = getTenure(stylists[i].tenure);
    }
    if (!stylists) {
      throw new ErrorHandler("Unable to get stylists", 404);
    }
    // Return the stylists data
    return res.status(200).json({
      success: true,
      data: stylists,
    });
  } catch (error) {
    next(error);
  }
};

const teamSchedule = async (req, res, next) => {
  const salonId = req?.salon._id;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    throw new ErrorHandler("Start and end date are required", 400);
  }
  try {
    const allStylists = await salonsModel
      .findById(salonId)
      .select("stylists")
      .exec();

    const stylistIds = allStylists.stylists.map((stylist) => stylist._id);
   if(stylistIds.length < 1){
    throw new ErrorHandler("No stylists found", 404);
   }

    const stylists = await stylistModel.aggregate([
      // Filter stylists based on the salonId and the stylists' ObjectIDs
      {
        $match: { _id: { $in: stylistIds } },
      },
      {
        $project: {
          stylist_name: 1,
          service_time: 1,
          stylist_Img: 1,
          time_for_service: {
            $filter: {
              input: "$time_for_service",
              as: "slot",
              cond: {
                $and: [
                  { $gte: ["$$slot.date", startDate] },
                  { $lte: ["$$slot.date", endDate] },
                ],
              },
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: stylists,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStylist,
  getOneStylist,
  deleteStylist,
  listAllStylist,
  removeStylist,
  updateStylist,
  teamMembers,
  teamSchedule,
  editEmployeeSchedule,
  deleteShift,
  addLeave,
  editShift,
  getShiftsByDay,
};
