const { appointmentModel } = require("../models/appointmentModel");
const { userModel } = require("../models/userModel");
const fetch = require("node-fetch");
const { ErrorHandler } = require("../utills/errorHandler");
const {
  sendOTP,
  sendAppointmentOTP,
  generateRandomOTPCode,
} = require("../utills/generateOTP");
const nodemailer = require("nodemailer");
const { salonsModel } = require("../models/salonsModel");
const mongoose = require("mongoose");
const { serviceModel } = require("../models/serviceModel");
const { stylistModel } = require("../models/stylistModel");
const holidayModel = require("../models/holidayModel");
const {
  addTimeAndPrice,
} = require("../controllers/utilityFunctions/addTimeAndPrice");
const {
  createTimeSlots,
  timeStringToMinutes,
  convertTo24HourFormat,
} = require("../controllers/utilityFunctions/createTimeSlots");
// otp sent to number and email for appointment
const sentOtpPhoneAndEmail = async (req, res, next) => {
  try {
    const user = req?.user;
    if (user) {
      const appointment = await appointmentModel.findOne({
        user_id: user?._id,
        status: "upcoming",
        payment_mode: "on-site",
      });
      // const appointment = await appointmentModel.findOne({user_id: user?._id, status: "upcoming", payment_type: "on-site"})

      if (appointment) {
        const otp = await sendOTP(user?.phone);
        if (otp) {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.USER_EMAIL,
              pass: process.env.USER_PASSWORD,
            },
          });
          var mailOptions = {
            from: process.env.USER_EMAIL,
            to: user?.email,
            subject: "Your OTP for on-site payment",
            text: `Your otp is ${otp}`,
          };
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              throw new ErrorHandler(error, 500);
            } else {
              return res.status(200).send({
                status: true,
                email: "Email sent: " + info.response,
                message: "OTP sent!",
                otp,
              });
            }
          });
        } else {
          throw new ErrorHandler(
            "Something went wrong while sending otp!",
            400
          );
        }
      }
    } else {
      throw new ErrorHandler("User does not exist & Forbidden access.", 401);
    }
  } catch (error) {
    next(error);
  }
};

// cancel appointment
const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    // Find appointment and update the status to cancel
    if (!id || !reason) {
      throw new ErrorHandler("Please provide appointment id and reason", 400);
    }
    const appointment = await appointmentModel.findOneAndUpdate(
      { _id: id },
      { status: "cancel", reason },
      { new: true } // return updated data
    );

    // if appointment exist
    if (!appointment) {
      throw new ErrorHandler("Appointment does not exist!", 400);
    }

    res.status(200).send({
      status: true,
      message: "Appointment cancelled!",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// reschedule appointment
const rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;
    if (!id || !date || !time) {
      throw new ErrorHandler(
        "Please provide appointment id, date and time",
        400
      );
    }
    const updateData = {
      bookingTime: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      start_date: new Date().toISOString().slice(0, 10),
      end_date: date,
      dateforService: date,
      time: time,
    };
    // Find appointment and update date and time
    const appointment = await appointmentModel.findOneAndUpdate(
      { _id: id },
      updateData,
      { new: true } // return updated data
    );
    // if appointment exist
    if (!appointment) {
      throw new ErrorHandler("Appointment does not exist!", 400);
    }

    res.status(200).send({
      status: true,
      message: "Appointment rescheduled!",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// get all cancel appointment of particular user
const getCancelAppointment = async (req, res, next) => {
  try {
    // Extract the email from the user object in the request
    const { email } = req?.user;
    if (!email) {
      throw new ErrorHandler("Please provide correct credentials", 400);
    }
    // Fetch upcoming appointments with detailed information using aggregation pipeline
    const appointments = await appointmentModel.aggregate([
      // Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      // Lookup salon details
      {
        $lookup: {
          from: "salons",
          localField: "salons_id",
          foreignField: "_id",
          as: "salonData",
        },
      },
      // Unwind the service_id array to handle empty arrays
      {
        $unwind: {
          path: "$service_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup service details
      {
        $lookup: {
          from: "services",
          let: { subCategoryId: "$service_id" },
          pipeline: [
            // Unwind mainCategories array
            { $unwind: "$mainCategories" },
            // Unwind subCategories array
            { $unwind: "$mainCategories.subCategories" },
            // Match subCategory ID
            {
              $match: {
                $expr: {
                  $eq: ["$mainCategories.subCategories._id", "$$subCategoryId"],
                },
              },
            },
            // Group to reconstruct subCategories array
            {
              $group: {
                _id: null,
                subCategories: { $push: "$mainCategories.subCategories" },
              },
            },
            // Project to exclude _id
            {
              $project: {
                _id: 0,
                subCategories: 1,
              },
            },
          ],
          as: "serviceData",
        },
      },
      // Lookup stylist details
      {
        $lookup: {
          from: "stylists",
          localField: "selectedStylistId",
          foreignField: "_id",
          as: "stylistData",
        },
      },
      // Match cancelled appointments for the specific user
      {
        $match: {
          "user.email": email,
          status: "cancel",
        },
      },
      // Group appointments to present detailed information
      {
        $unwind: {
          path: "$serviceData",
        },
      },
      {
        $unwind: {
          path: "$serviceData.subCategories",
        },
      },
      {
        $group: {
          _id: "$_id",
          user_id: { $first: "$user_id" },
          initial_amount: { $first: "$initial_amount" },
          final_amount: { $first: "$final_amount" },
          bookingTime: { $first: "$bookingTime" },
          start_date: { $first: "$start_date" },
          end_date: { $first: "$end_date" },
          status: { $first: "$status" },
          payment_mode: { $first: "$payment_mode" },
          time: { $first: "$time" },
          salonData: { $first: "$salonData" },
          serviceData: { $addToSet: "$serviceData.subCategories" },
          stylistData: { $first: "$stylistData" },
          noPreference: { $first: "$noPreference" },
          otp: { $first: "$otp" },
        },
      },
      // Project to include specific fields in the final output
      {
        $project: {
          _id: 1,
          "salonData._id": 1,
          "salonData.salon_name": 1,
          "salonData.locationText": 1,
          "salonData.salon_Img": 1,
          serviceData: 1,
          "stylistData.stylist_name": 1,
          "stylistData.stylist_Img": 1,
          user_id: 1,
          initial_amount: 1,
          final_amount: 1,
          bookingTime: 1,
          start_date: 1,
          end_date: 1,
          time: 1,
          status: 1,
          payment_mode: 1,
          dateforService: 1,
          noPreference: 1,
          otp: 1,
        },
      },
    ]);
    for (const appointment of appointments) {
      const service_id = await appointmentModel
        .findById(appointment._id)
        .select("service_id");
      appointment.service_id = service_id.service_id;
    }
    // Send a response with the fetched appointments
    res.status(200).send({ status: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// get all upcoming appointment of particular user
const getUpcomingAppointment = async (req, res, next) => {
  try {
    // Extract the email from the user object in the request
    const { email } = req?.user;
    if (!email) {
      throw new ErrorHandler("Please provide correct credentials", 400);
    }

    // Fetch upcoming appointments with detailed information using aggregation pipeline
    const appointments = await appointmentModel.aggregate([
      // Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      // Lookup salon details
      {
        $lookup: {
          from: "salons",
          localField: "salons_id",
          foreignField: "_id",
          as: "salonData",
        },
      },
      // Unwind the service_id array to handle empty arrays
      {
        $unwind: {
          path: "$service_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup service details
      {
        $lookup: {
          from: "services",
          let: { subCategoryId: "$service_id" },
          pipeline: [
            // Unwind mainCategories array
            { $unwind: "$mainCategories" },
            // Unwind subCategories array
            { $unwind: "$mainCategories.subCategories" },
            // Match subCategory ID
            {
              $match: {
                $expr: {
                  $eq: ["$mainCategories.subCategories._id", "$$subCategoryId"],
                },
              },
            },
            // Group to reconstruct subCategories array
            {
              $group: {
                _id: null,
                subCategories: { $push: "$mainCategories.subCategories" },
              },
            },
            // Project to exclude _id
            {
              $project: {
                _id: 0,
                subCategories: 1,
              },
            },
          ],
          as: "serviceData",
        },
      },
      // Lookup stylist details
      {
        $lookup: {
          from: "stylists",
          localField: "selectedStylistId",
          foreignField: "_id",
          as: "stylistData",
        },
      },
      // Match upcoming appointments for the specific user
      {
        $match: {
          "user.email": email,
          status: "upcoming",
        },
      },
      // Group appointments to present detailed information
      {
        $unwind: {
          path: "$serviceData",
        },
      },
      {
        $unwind: {
          path: "$serviceData.subCategories",
        },
      },
      {
        $group: {
          _id: "$_id",
          user_id: { $first: "$user_id" },
          initial_amount: { $first: "$initial_amount" },
          final_amount: { $first: "$final_amount" },
          bookingTime: { $first: "$bookingTime" },
          start_date: { $first: "$start_date" },
          end_date: { $first: "$end_date" },
          status: { $first: "$status" },
          payment_mode: { $first: "$payment_mode" },
          time: { $first: "$time" },
          salonData: { $first: "$salonData" },
          serviceData: { $addToSet: "$serviceData.subCategories" },
          stylistData: { $first: "$stylistData" },
          noPreference: { $first: "$noPreference" },
          otp: { $first: "$otp" },
        },
      },
      // Project to include specific fields in the final output
      {
        $project: {
          _id: 1,
          "salonData._id": 1,
          "salonData.salon_name": 1,
          "salonData.locationText": 1,
          "salonData.salon_Img": 1,
          serviceData: 1,
          "stylistData.stylist_name": 1,
          "stylistData.stylist_Img": 1,
          user_id: 1,
          initial_amount: 1,
          final_amount: 1,
          bookingTime: 1,
          start_date: 1,
          end_date: 1,
          time: 1,
          status: 1,
          payment_mode: 1,
          dateforService: 1,
          noPreference: 1,
          otp: 1,
        },
      },
    ]);
    for (const appointment of appointments) {
      const service_id = await appointmentModel
        .findById(appointment._id)
        .select("service_id");
      appointment.service_id = service_id.service_id;
    }
    // Send a response with the fetched appointments
    res.status(200).send({ status: true, data: appointments });
  } catch (error) {
    next(error);
  }
};
// get all completed appointment of particular user
const getCompletedAppointment = async (req, res, next) => {
  salons;
  try {
    // Extract the email from the user object in the request
    const { email } = req?.user;
    if (!email) {
      throw new ErrorHandler("Please provide correct credentials", 400);
    }
    // Fetch completed appointments with detailed information using aggregation pipeline
    const appointments = await appointmentModel.aggregate([
      // Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      // Lookup salon details
      {
        $lookup: {
          from: "salons",
          localField: "salons_id",
          foreignField: "_id",
          as: "salonData",
        },
      },
      // Unwind the service_id array to handle empty arrays
      {
        $unwind: {
          path: "$service_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup service details
      {
        $lookup: {
          from: "services",
          let: { subCategoryId: "$service_id" },
          pipeline: [
            // Unwind mainCategories array
            { $unwind: "$mainCategories" },
            // Unwind subCategories array
            { $unwind: "$mainCategories.subCategories" },
            // Match subCategory ID
            {
              $match: {
                $expr: {
                  $eq: ["$mainCategories.subCategories._id", "$$subCategoryId"],
                },
              },
            },
            // Group to reconstruct subCategories array
            {
              $group: {
                _id: null,
                subCategories: { $push: "$mainCategories.subCategories" },
              },
            },
            // Project to exclude _id
            {
              $project: {
                _id: 0,
                subCategories: 1,
              },
            },
          ],
          as: "serviceData",
        },
      },
      // Lookup stylist details
      {
        $lookup: {
          from: "stylists",
          localField: "selectedStylistId",
          foreignField: "_id",
          as: "stylistData",
        },
      },
      // Match completed appointments for the specific user
      {
        $match: {
          "user.email": email,
          status: "completed",
        },
      },
      // Group appointments to present detailed information
      {
        $unwind: {
          path: "$serviceData",
        },
      },
      {
        $unwind: {
          path: "$serviceData.subCategories",
        },
      },
      {
        $group: {
          _id: "$_id",
          user_id: { $first: "$user_id" },
          initial_amount: { $first: "$initial_amount" },
          final_amount: { $first: "$final_amount" },
          bookingTime: { $first: "$bookingTime" },
          start_date: { $first: "$start_date" },
          end_date: { $first: "$end_date" },
          status: { $first: "$status" },
          payment_mode: { $first: "$payment_mode" },
          time: { $first: "$time" },
          salonData: { $first: "$salonData" },
          serviceData: { $addToSet: "$serviceData.subCategories" },
          stylistData: { $first: "$stylistData" },
          noPreference: { $first: "$noPreference" },
          otp: { $first: "$otp" },
        },
      },
      // Project to include specific fields in the final output
      {
        $project: {
          _id: 1,
          "salonData._id": 1,
          "salonData.salon_name": 1,
          "salonData.locationText": 1,
          "salonData.salon_Img": 1,
          serviceData: 1,
          "stylistData.stylist_name": 1,
          "stylistData.stylist_Img": 1,
          user_id: 1,
          initial_amount: 1,
          final_amount: 1,
          bookingTime: 1,
          start_date: 1,
          end_date: 1,
          time: 1,
          status: 1,
          payment_mode: 1,
          dateforService: 1,
          noPreference: 1,
          otp: 1,
        },
      },
    ]);
    for (const appointment of appointments) {
      const service_id = await appointmentModel
        .findById(appointment._id)
        .select("service_id");
      appointment.service_id = service_id.service_id;
    }
    // Send a response with the fetched appointments
    res.status(200).send({ status: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

const generateSloats = async (req, res, next) => {
  const validUser = req?.user._id || req?.salon._id;
  try {
    let {
      salons_id,
      service_id,
      noPreference,
      dateforService,
      selectedStylistId,
    } = req.body;
    //find user
    let user = await userModel.findById(validUser);
    if (!user) {
      throw new ErrorHandler("User not found", 400);
    }
    //check if the salon is open or closed in the dateforService
    const salonHoliday = await holidayModel
      .findOne({ salon: salons_id })
      .where("holidays.date")
      .equals(dateforService);
    if (salonHoliday) {
      if (salonHoliday.holidays.status === "closed") {
        throw new ErrorHandler("Salon is closed on this date", 400);
      }
    }

    //find salon
    const salon = await salonsModel.findOne({ _id: salons_id });

    if (!salon) {
      throw new ErrorHandler("Salon does not exist!!", 400);
    }

    //get user selected Ids
    const selectedServiceIds = service_id.map((service) =>
      new mongoose.Types.ObjectId(service).toString()
    );
    if (!selectedServiceIds) {
      throw new ErrorHandler("Please provide service Ids", 400);
    }
    //get all the subCategory from services
    const allSalonSubCategories = await Promise.all(
      salon.services.map(async (serviceId) => {
        const service = await serviceModel.findById(serviceId);
        return service
          ? service.mainCategories.flatMap(
              (subCategory) => subCategory.subCategories || []
            )
          : [];
      })
    );

    // Flatten the array of subcategories
    const allSubCategories = allSalonSubCategories.flat();
    if (!allSubCategories) {
      throw new ErrorHandler("No subcategories found", 400);
    }

    // Find service details for each selected service
    const selectedServicesInfo = selectedServiceIds.map((selectedServiceId) => {
      const selectedService = allSubCategories.find((service) => {
        return service._id.toString() === selectedServiceId;
      });

      return selectedService
        ? {
            _id: selectedService._id,
            service_price: selectedService.price,
            time_takenby_service: selectedService.time_takenby_service,
          }
        : "Service not found";
    });
    if (!selectedServicesInfo) {
      throw new ErrorHandler("No service info found", 400);
    }

    const { totalTime, totalService } = addTimeAndPrice(selectedServicesInfo);
    serviceDataSendToResponse = { totalTime, totalService };
    if (!serviceDataSendToResponse) {
      throw new ErrorHandler("total Time or total services not found", 400);
    }

    // Time Slot generation
    const slotTime = salon.salots_gap;
    const workingHours = salon.working_hours;
    if (!slotTime || !workingHours || !dateforService) {
      throw new ErrorHandler(
        "Please provide slot time, working hours and date for service",
        400
      );
    }
    let time_sloats = createTimeSlots(slotTime, workingHours, dateforService);
    if (!time_sloats) {
      throw new ErrorHandler("Failed to create time slots", 400);
    }
    time_sloats = convertTo24HourFormat(time_sloats);
    const selectedDate = new Date(dateforService); // Replace with the user-entered date
    const selectedDateString = selectedDate.toDateString();

    let result = [];

    if (noPreference) {
      const totalStylistIds = salon.stylists;

      // Fetch all stylist data
      const stylistData = await stylistModel.find({
        _id: { $in: totalStylistIds },
      });
      if (!stylistData) {
        throw new ErrorHandler("No stylist data found", 400);
      }
      const allStylistSlots = stylistData.flatMap((stylist) => {
        const slotsForDate = stylist.time_for_service
          .filter((item) => {
            const itemDate = new Date(item.date).toDateString();
            return itemDate === selectedDateString || !selectedDateString;
          })
          .map((item) => item.time_slots.filter((slot) => !slot.isBooked))
          .flat();
        return slotsForDate;
      });

      // Set the maximum allowed occurrences for the specific slot
      const maxOccurrences = stylistData.length;

      // Create a counter object to track occurrences of each slot
      const slotOccurrences = {};
      // Filter the slots based on the maximum allowed occurrences for the target slot
      const filteredSlots = allStylistSlots.filter((slot) => {
        // Initialize the counter for the slot if it's not already set
        slotOccurrences[slot] = (slotOccurrences[slot] || 0) + 1;

        // Include the slot only if its occurrences are less than or equal to the maximum
        return slotOccurrences[slot] == maxOccurrences;
      });
      if (filteredSlots.length == 0) {
        result = time_sloats;
      } else {
        result = time_sloats.filter((slot) =>
          filteredSlots.some(
            (subArray) => subArray.slot === slot && !subArray.isBooked
          )
        );
      }
    }
    if (selectedStylistId) {
      const stylistObjectId = new mongoose.Types.ObjectId(selectedStylistId);

      // Fetch data for the selected stylist
      const stylistSelectedData = await stylistModel.findOne({
        _id: stylistObjectId,
      });
      if (!stylistSelectedData) {
        throw new ErrorHandler("Stylists not found", 400);
      }
      // Find time slots for the selected date
      const slotsForDate =
        stylistSelectedData.time_for_service
          ?.filter((item) => {
            const itemDate = new Date(item.date).toDateString();
            return itemDate === selectedDateString || !selectedDateString;
          })
          ?.flatMap((item) =>
            item.time_slots.filter((slot) => !slot.isBooked)
          ) || [];
      if (slotsForDate.length == 0) {
        result = time_sloats;
      } else {
        result = time_sloats.filter((slot) =>
          slotsForDate.some(
            (subArray) => subArray.slot === slot && !subArray.isBooked
          )
        );
      }

      // Get non-overlapping slots for the selected stylist
    }
    res.json({
      success: true,
      message: "Slot Generated Successfully",
      data: result,
      serviceDataSendToResponse,
    });
    return;
  } catch (err) {
    next(err);
  }
};

const bookAppointment = async (req, res, next) => {
  try {
    let {
      user_id,
      salons_id,
      service_id,
      final_amount,
      time,
      payment_mode,
      noPreference,
      selectedStylistId,
      dateforService,
      userData,
    } = req.body;
    //find user
    let user = await userModel.findById({ _id: user_id });

    if (!user) {
      throw new ErrorHandler("User not found", 400);
    }

    //find salon
    const salon = await salonsModel.findOne({ _id: salons_id });

    if (!salon) {
      throw new ErrorHandler("Salon does not exist!!", 400);
    }

    //get user selected Ids
    const selectedServiceIds = service_id.map((service) =>
      new mongoose.Types.ObjectId(service).toString()
    );
    if (!selectedServiceIds) {
      throw new ErrorHandler("Please provide service Ids", 400);
    }
    //get all the subCategory from services
    const allSalonSubCategories = await Promise.all(
      salon.services.map(async (serviceId) => {
        const service = await serviceModel.findById(serviceId);
        return service
          ? service.mainCategories.flatMap(
              (subCategory) => subCategory.subCategories || []
            )
          : [];
      })
    );
    // Flatten the array of subcategories
    const allSubCategories = allSalonSubCategories.flat();
    if (!allSubCategories) {
      throw new ErrorHandler("No subcategories found", 400);
    }
    // Find service details for each selected service
    //i have to store time_for_service of each service
    const timeTaken = selectedServiceIds
      .map((selectedSID) => {
        const selectedTime = allSubCategories.find(
          (service) => service._id.toString() === selectedSID
        );

        if (selectedTime && selectedTime.time_takenby_service !== undefined) {
          return selectedTime.time_takenby_service.toString();
        } else {
          return null; // Return null for "Service not found" or if time_takenby_service is undefined
        }
      })
      .filter((time) => time !== null);
    let totalMinutes = timeTaken.reduce(
      (acc, time) => acc + timeStringToMinutes(time),
      0
    );
    if (totalMinutes < 30) {
      throw new ErrorHandler("invalid service timing", 400);
    }
    const totalslotTime = Math.ceil(totalMinutes / 30);
    const selectedServicesIds = selectedServiceIds.map((selectedServiceId) => {
      const selectedService = allSubCategories.find((service) => {
        return service._id.toString() === selectedServiceId;
      });
      return selectedService
        ? {
            _id: selectedService._id,
          }
        : "Service not found";
    });
    const forCheckingServiceNotFound = selectedServicesIds.map(
      (service) => service == "Service not found"
    );

    if (forCheckingServiceNotFound.some((value) => value === true)) {
      throw new ErrorHandler("Service Not Found!!", 400);
    }
    const selectedServiceId = selectedServicesIds.map((service) =>
      service._id.toString()
    );

    //get stylist info
    if (selectedStylistId) {
      const stylist = await stylistModel.findById(selectedStylistId);

      if (!stylist) {
        throw new ErrorHandler("Stylist Not Found!!", 400);
      }

      // Find the slot matching the date and time
      let timeForService = stylist.time_for_service.find(
        (slot) => slot.date === dateforService
      );

      if (!timeForService) {
        throw new ErrorHandler(
          "Time slot not available for the specified date",
          400
        );
      }

      let timeSlot = timeForService.time_slots.find(
        (slot) => slot.slot === time
      );

      if (!timeSlot) {
        throw new ErrorHandler(
          "Time slot not found for the specified time",
          400
        );
      }
      // Mark the slot as booked along with further totalslotTime number of slots also as booked
      let slotIndex = timeForService.time_slots.indexOf(timeSlot);
      for (let index = slotIndex; index < slotIndex + totalslotTime; index++) {
        timeForService.time_slots[index].isBooked = true;
        // Save the updated stylist document
      }
      await stylist.save();
    }
    //send otp to user and salon
    const otp = generateRandomOTPCode();
    if (String(userData.phone).startsWith("+91")) {
      userData.phone = userData.phone.substring(3);
    }
    if (String(salon.salons_phone_number).startsWith("+91")) {
      salon.salons_phone_number = String(salon.salons_phone_number).substring(
        3
      );
    }
    if (payment_mode === "on-site") {
      const toUser = sendAppointmentOTP(userData.phone, otp);
      const toSalon = sendAppointmentOTP(salon.salons_phone_number, otp);
    }
    userData.phone = `+91${userData.phone}`;
    const newAppointment = await appointmentModel.create({
      user_id,
      salons_id,
      service_id: selectedServiceId,
      selectedStylistId: selectedStylistId ? selectedStylistId : null,
      final_amount,
      end_date: dateforService,
      time: time,
      totalTimeTaken: totalMinutes,
      status: "upcoming",
      payment_mode,
      noPreference: noPreference ? true : null,
      dateforService,
      userData,
      otp: payment_mode !== "online" ? otp : undefined,
    });
    const appointmentId = newAppointment._id.toString();
    const orderUrl = `https://backend.treato.in/api/v1/order/createOrder/${appointmentId}`;
    const response = await fetch(orderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Allow-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ appointmentId }),
    });
    if (!response.ok) {
      const del = await appointmentModel.findByIdAndDelete(order.appointmentId);
      const errorData = await response.json();
    } else {
      const responseData = await response.json();
      return res.json(responseData);
    }
  } catch (err) {
    next(err);
  }
};

const salonOffers = async (req, res, next) => {
  try {
    let { user_id, salons_id, totalAmount } = req.body;

    let user = await userModel.findById({ _id: user_id });

    if (!user) {
      throw new ErrorHandler("User not found", 400);
    }

    //find salon
    const salon = await salonsModel.findOne({ _id: salons_id });

    if (!salon) {
      throw new ErrorHandler("Salon does not exist!!", 400);
    }

    const salonOffers = salon.salon_offers;
    if (!salonOffers) {
      throw new ErrorHandler("Salon Offers were not found", 404);
    }

    const userAppointmentData = await appointmentModel.find({
      user_id: new mongoose.Types.ObjectId(user_id),
    });

    const counts = userAppointmentData.reduce(
      (result, appointmentData) => {
        if (appointmentData.status === "cancel") {
          result.cancelCount += 1;
        } else if (appointmentData.status === "upcoming") {
          result.upcomingCount += 1;
        } else if (appointmentData.status === "completed") {
          result.completedCount += 1;
        }
        return result;
      },
      { cancelCount: 0, upcomingCount: 0, completedCount: 0 }
    );

    const cancelCount = counts.cancelCount;
    const upcomingCount = counts.upcomingCount;
    const completedCount = counts.completedCount;

    function getSalonOffers(totalAmount, salonOffers) {
      let applicableOffers = [];

      for (const offer of salonOffers) {
        if (totalAmount >= offer.amount_for_discount) {
          applicableOffers.push(offer);
        }
        if (completedCount > 0) {
          if (offer.for_first_order) {
            applicableOffers.push(null);
          }
        } else if (cancelCount <= 1 || offer.status == "upcoming") {
          if (offer.for_first_order) {
            applicableOffers.push(offer);
          }
        }
      }
      // Return the array of applicable offers
      return applicableOffers.length > 0 ? applicableOffers : null;
    }

    // Example usage
    const applicableSalonOffer = getSalonOffers(totalAmount, salonOffers);

    if (!applicableSalonOffer) {
      throw new ErrorHandler("Any Offer is Not Appicable", 400);
    }

    res.json({
      success: true,
      message: "Offer Return Successfully",
      data: applicableSalonOffer,
    });
  } catch (err) {
    next(err);
  }
};

const todaysAppointments = async (req, res, next) => {
  const { id } = req?.salon;
  // const id="6508592af8131fc40b478125";
  if (!id) {
    throw new ErrorHandler("Salon not found", 400);
  }
  try {
    const appointments = await appointmentModel
      .find({
        salons_id: id,
        end_date: new Date().toISOString().slice(0, 10),
      })
      .populate({
        path: "user_id",
        model: userModel,
        select: "_id first_name last_name phone email dob gender",
      })
      .select(
        "_id salons_id service_id selectedStylistId final_amount start_date end_date time status payment_mode noPreference dateforService userData otp"
      )
      .exec();
    if (!appointments) {
      throw new ErrorHandler("No appointments for today", 400);
    }
    res.status(200).send({ status: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

const verifyAppointment = async (req, res, next) => {
  const { _id } = req?.salon;
  if (!_id) {
    throw new ErrorHandler("Salon not found", 400);
  }
  try {
    const appointmentId = req.params.id;
    const { otp } = req.body;
    if (!otp) {
      throw new ErrorHandler("Provide otp for verification", 400);
    }
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ErrorHandler("Appointment Not Found", 400);
    }
    if (appointment.otp === otp) {
      const updateAppointment = await appointmentModel.findByIdAndUpdate(
        appointmentId,
        { status: "completed" }
      );
      res.status(200).send({ status: true, message: "Appointment Verified" });
    } else {
      throw new ErrorHandler("Invalid OTP", 400);
    }
  } catch (error) {
    next(error);
  }
};

const getSalonClients = async (req, res, next) => {
  try {
    const salonId = req?.salon?._id;

    const clientData = await appointmentModel.aggregate([
      { $match: { salons_id: salonId } },
      { $unwind: "$userData" },
      {
        $group: {
          _id: "$userData.email",
          userData: { $addToSet: "$userData" },
        },
      },
      {
        $replaceRoot: { newRoot: { $arrayElemAt: ["$userData", 0] } },
      },
      { $project: { _id: 0 } }, // Exclude _id field
    ]);
    if (!clientData) {
      throw new ErrorHandler("Clients were not found", 404);
    }
    res
      .status(200)
      .json({ message: "All clients", status: true, data: clientData });
  } catch (error) {
    next(error);
  }
};

//ID-20
const walkinAppointment = async (req, res, next) => {
  const _id = req?.salon._id;
  try {
    const {
      service_id,
      final_amount,
      time,
      noPreference,
      selectedStylistId,
      dateforService,
      userData,
      additionalComments,
    } = req.body;
    //find user
    const existingUser = await userModel.findOne({
      $or: [{ email: userData.email }, { phone: userData.phone }],
    });

    //find salon
    const salon = await salonsModel.findById(_id);
    if (!salon) {
      throw new ErrorHandler("Salon does not exist!!", 400);
    }

    //get user selected Ids
    const selectedServiceIds = service_id.map((service) =>
      new mongoose.Types.ObjectId(service).toString()
    );
    if (!selectedServiceIds) {
      throw new ErrorHandler("Please provide service Ids", 400);
    }

    //get all the subCategory from services
    const allSalonSubCategories = await Promise.all(
      salon.services.map(async (serviceId) => {
        const service = await serviceModel.findById(serviceId);
        return service
          ? service.mainCategories.flatMap(
              (subCategory) => subCategory.subCategories || []
            )
          : [];
      })
    );
    // Flatten the array of subcategories
    const allSubCategories = allSalonSubCategories.flat();
    if (!allSubCategories) {
      throw new ErrorHandler("No subcategories found", 400);
    }
    const selectedServicesIds = selectedServiceIds.map((selectedServiceId) => {
      const selectedService = allSubCategories.find((service) => {
        return service._id.toString() === selectedServiceId;
      });
      return selectedService
        ? {
            _id: selectedService._id,
          }
        : "Service not found";
    });
    const forCheckingServiceNotFound = selectedServicesIds.map(
      (service) => service == "Service not found"
    );

    if (forCheckingServiceNotFound.some((value) => value === true)) {
      throw new ErrorHandler("Service Not Found!!", 400);
    }
    const selectedServiceId = selectedServicesIds.map((service) =>
      service._id.toString()
    );

    // Check if stylist info is provided
    if (selectedStylistId) {
      const stylistId = await stylistModel.findById(selectedStylistId);

      if (!stylistId) {
        throw new ErrorHandler("Stylist Not Found!!", 400);
      }
    }
    //save appointment
    const newAppointment = await appointmentModel.create({
      salons_id: _id,
      service_id: selectedServiceId,
      user_id: existingUser ? existingUser._id : null,
      selectedStylistId: selectedStylistId ? selectedStylistId : null,
      final_amount,
      start_date: dateforService,
      end_date: dateforService,
      time,
      status: "completed",
      payment_mode: "on-site",
      noPreference: noPreference ? true : null,
      dateforService,
      userData,
      additionalComments,
    });

    const appointmentId = newAppointment._id.toString();
    const orderUrl = `https://backend.treato.in/api/v1/order/createOrder/${appointmentId}`;
    const response = await fetch(orderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Allow-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ appointmentId }),
    });
    if (!response.ok) {
      const del = await appointmentModel.findByIdAndDelete(order.appointmentId);
      const errorData = await response.json();
    } else {
      const responseData = await response.json();
      return res.json(responseData);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sentOtpPhoneAndEmail,
  cancelAppointment,
  rescheduleAppointment,
  getCancelAppointment,
  getUpcomingAppointment,
  getCompletedAppointment,
  generateSloats,
  bookAppointment,
  salonOffers,
  todaysAppointments,
  verifyAppointment,
  walkinAppointment,
  getSalonClients,
};
