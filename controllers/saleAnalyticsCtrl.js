const { appointmentModel } = require("../models/appointmentModel");
const { userModel } = require("../models/userModel");
const { serviceModel } = require("../models/serviceModel");
const { ErrorHandler } = require("../utills/errorHandler");

const getAppointmentandAmtPerDay = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const salon_id = req?.salon._id;
    if (!startDate || !endDate) {
      throw new ErrorHandler("Please provide start date and end date", 400);
    }
    if (!salon_id) {
      throw new ErrorHandler("Please provide salon id", 400);
    }
    // Fetch appointments within the specified date range
    const result = await appointmentModel
      .find({
        salons_id: salon_id,
        dateforService: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .select({
        dateforService: 1,
        final_amount: 1,
      })
      .sort({ dateforService: 1 });

    // Process the results to calculate totals for each date
    const appointmentsByDate = {};
    result.forEach((appointment) => {
      const date = appointment.dateforService;
      if (!appointmentsByDate[date]) {
        appointmentsByDate[date] = {
          totalAppointments: 0,
          totalFinalAmount: 0,
        };
      }
      appointmentsByDate[date].totalAppointments++;
      appointmentsByDate[date].totalFinalAmount += appointment.final_amount;
    });

    if (Object.keys(appointmentsByDate).length === 0) {
      throw new ErrorHandler("No appointments found", 404);
    }

    // Convert the result to the desired format
    const formattedResult = Object.entries(appointmentsByDate).map(
      ([date, totals]) => ({
        date,
        totalAppointments: totals.totalAppointments,
        totalFinalAmount: totals.totalFinalAmount,
      })
    );
    //adding objects of remaining dates as 0
    for (
      let date = new Date(startDate);
      date <= new Date(endDate);
      date.setDate(date.getDate() + 1)
    ) {
      let dateStr = date.toISOString().slice(0, 10);
      if (!appointmentsByDate[dateStr]) {
        formattedResult.push({
          date: dateStr,
          totalAppointments: 0,
          totalFinalAmount: 0,
        });
      }
    }

    //sort formattedResult by date
    formattedResult.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    if (formattedResult.length === 0) {
      throw new ErrorHandler("No data found", 404);
    }

    res.json({ appointmentsAndFinalAmount: formattedResult });
  } catch (error) {
    next(error);
  }
};

const getSalonGeneralAnalytics = async (req, res, next) => {
  // Extract salon ID and days from request
  const _id = req?.salon._id;
  // const _id="6508592af8131fc40b478125"
  const { days } = req?.query;
  if (!_id || !days) {
    throw new ErrorHandler("Please provide salon id and days", 400);
  }

  try {
    // Calculate start date and previous start date based on provided days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const prestartDate = new Date();
    prestartDate.setDate(prestartDate.getDate() - 2 * days);

    // Get total users, final amount, and appointments within the last {days}
    const [totalUsers, totalAppointments, preTotalDocuments] =
      await Promise.all([
        appointmentModel
          .countDocuments({
            salons_id: _id,
            dateforService: { $gte: startDate.toISOString().slice(0, 10) },
          })
          .distinct("user_id")
          .exec(),
        appointmentModel
          .find({
            salons_id: _id,
            dateforService: { $gte: startDate.toISOString().slice(0, 10) },
          })
          .select("final_amount")
          .exec(),
        appointmentModel
          .find({
            salons_id: _id,
            dateforService: {
              $lt: startDate.toISOString().slice(0, 10),
              $gte: prestartDate.toISOString().slice(0, 10),
            },
          })
          .select("final_amount user_id")
          .exec(),
      ]);
    //check for empty results
    if (
      totalUsers.length === 0 ||
      totalAppointments.length === 0 ||
      preTotalDocuments.length === 0
    ) {
      throw new ErrorHandler("No data found", 404);
    }

    // Calculate total users count, total appointments count, and total final amount
    const totalUsersCount = totalUsers.length;
    const totalAppointmentsCount = totalAppointments.length;
    const totalFinalAmount = totalAppointments.reduce(
      (total, appointment) => total + parseInt(appointment.final_amount, 10),
      0
    );

    // Calculate previous total users count, total appointments count, and total final amount
    const uniqueUserIds = new Set(
      preTotalDocuments.map((appointment) => appointment.user_id.toString())
    );
    const preTotalUsers = uniqueUserIds.size;
    const preTotalAppointmentsCount = preTotalDocuments.length;
    const preTotalFinalAmount = preTotalDocuments.reduce(
      (total, appointment) => {
        const amount = parseInt(appointment.final_amount, 10);
        return isNaN(amount) ? total : total + amount;
      },
      0
    );

    // Calculate increase of users, amount, and appointments along with their percentage increase
    const increaseUsers =
      totalUsersCount > preTotalUsers ? totalUsersCount - preTotalUsers : 0;
    const increaseUsersPercentage = (
      (increaseUsers / preTotalUsers) *
      100
    ).toFixed(2);
    const increaseFinalAmount =
      totalFinalAmount > preTotalFinalAmount
        ? totalFinalAmount - preTotalFinalAmount
        : 0;
    const increaseFinalAmountPercentage = (
      (increaseFinalAmount / preTotalFinalAmount) *
      100
    ).toFixed(2);
    const increaseAppointments =
      totalAppointmentsCount > preTotalAppointmentsCount
        ? totalAppointmentsCount - preTotalAppointmentsCount
        : 0;
    const increaseAppointmentsPercentage = (
      (increaseAppointments / preTotalAppointmentsCount) *
      100
    ).toFixed(2);

    // Send response with general analytics data
    res.json({
      newUsers: totalUsersCount,
      incrementOfNewUsers: increaseUsers,
      incrementOfNewUsersPercentage: increaseUsersPercentage,
      newAmount: totalFinalAmount,
      incrementOfNewAmount: increaseFinalAmount,
      incrementOfNewAmountPercentage: increaseFinalAmountPercentage,
      newAppointments: totalAppointmentsCount,
      incrementOfNewAppointments: increaseAppointments,
      incrementOfNewAppointmentsPercentage: increaseAppointmentsPercentage,
    });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const recentActivity = async (req, res, next) => {
  // Extract salon ID from request
  const _id = req?.salon._id;
  if (!_id) {
    throw new Error("Please provide salon id", 400);
  }
  try {
    // Calculate date N days ago
    let NDaysAgo = new Date();
    NDaysAgo.setDate(NDaysAgo.getDate() - 7);
    NDaysAgo = NDaysAgo.toISOString().slice(0, 10);

    const appointments = await appointmentModel.aggregate([
      {
        $match: {
          salons_id: _id,
          dateforService: {
            $gte: NDaysAgo,
            $lte: new Date().toISOString().slice(0, 10),
          },
          status: { $in: ["completed", "cancel"] },
        },
      },
      {
        $unwind: {
          path: "$service_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "services",
          let: { subCategoryId: "$service_id" },
          pipeline: [
            { $unwind: "$mainCategories" },
            { $unwind: "$mainCategories.subCategories" },
            {
              $match: {
                $expr: {
                  $eq: ["$mainCategories.subCategories._id", "$$subCategoryId"],
                },
              },
            },
            {
              $group: {
                _id: null,
                subCategories: { $push: "$mainCategories.subCategories" },
              },
            },
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
      {
        $unwind: {
          path: "$selectedStylistId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "stylists",
          localField: "selectedStylistId",
          foreignField: "_id",
          as: "stylistData",
        },
      },
      {
        $unwind: "$serviceData",
      },
      {
        $unwind: "$serviceData.subCategories",
      },
      {
        $group: {
          _id: {
            appointmentId: "$_id",
            serviceId: "$serviceData.subCategories._id",
          },
          final_amount: { $first: "$final_amount" },
          dateforService: { $first: "$dateforService" },
          status: { $first: "$status" },
          time: { $first: "$time" },
          serviceData: { $first: "$serviceData.subCategories" },
          stylistData: { $first: "$stylistData" },
          noPreference: { $first: "$noPreference" },
          start_date: { $first: "$start_date" },
        },
      },
      {
        $project: {
          _id: "$_id.appointmentId",
          serviceData: 1,
          "stylistData.stylist_name": 1,
          "stylistData.stylist_Img": 1,
          final_amount: 1,
          dateforService: 1,
          time: 1,
          status: 1,
          noPreference: 1,
          start_date: 1,
        },
      },
    ]);
    if (appointments.length === 0) {
      throw new ErrorHandler("No appointments found", 404);
    }

    // Send response with recent activities data
    res.status(200).json({
      message: "Recent Activities",
      data: appointments,
    });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const upcomingAppointments = async (req, res, next) => {
  const _id = req?.salon._id;
  if (_id) {
    throw new ErrorHandler("Please provide salon id", 400);
  }
  try {
    const appointments = await appointmentModel.aggregate([
      {
        $match: {
          salons_id: _id,
          dateforService: { $gte: new Date().toISOString().slice(0, 10) },
        },
      },
      {
        $unwind: {
          path: "$service_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "services",
          let: { subCategoryId: "$service_id" },
          pipeline: [
            { $unwind: "$mainCategories" },
            { $unwind: "$mainCategories.subCategories" },
            {
              $match: {
                $expr: {
                  $eq: ["$mainCategories.subCategories._id", "$$subCategoryId"],
                },
              },
            },
            {
              $group: {
                _id: null,
                subCategories: { $push: "$mainCategories.subCategories" },
              },
            },
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
      {
        $lookup: {
          from: "stylists",
          localField: "selectedStylistId",
          foreignField: "_id",
          as: "stylistData",
        },
      },
      {
        $unwind: "$serviceData",
      },
      {
        $unwind: "$serviceData.subCategories",
      },
      {
        $group: {
          _id: {
            appointmentId: "$_id",
            serviceId: "$serviceData.subCategories._id",
          },
          final_amount: { $first: "$final_amount" },
          dateforService: { $first: "$dateforService" },
          status: { $first: "$status" },
          time: { $first: "$time" },
          serviceData: { $first: "$serviceData.subCategories" },
          stylistData: { $first: "$stylistData" },
          noPreference: { $first: "$noPreference" },
          userData: { $first: "$userData" },
        },
      },
      {
        $project: {
          _id: "$_id.appointmentId",
          serviceData: 1,
          "stylistData.stylist_name": 1,
          "stylistData.stylist_Img": 1,
          final_amount: 1,
          dateforService: 1,
          time: 1,
          status: 1,
          noPreference: 1,
          userData: 1,
        },
      },
    ]);
    if (appointments.length === 0) {
      throw new ErrorHandler("No appointments found", 404);
    }
    res.status(200).json({
      message: "Upcoming Appointments",
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

const topServicesWithinNDays = async (req, res, next) => {
  // Extracting salon ID and days from the request
  const salon_id = req?.salon._id;
  const { days } = req?.query;
  if (!salon_id || !days) {
    throw new ErrorHandler("Please provide salon id and days", 400);
  }
  try {
    // Calculate the start date based on the provided days
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate = startDate.toISOString().slice(0, 10);
    //first let's find appointments within range
    const appointments = await appointmentModel.find({
      salons_id: salon_id,
      dateforService: { $gte: startDate },
    });
    if (appointments.length === 0) {
      throw new ErrorHandler(
        "No appointments found within the given date",
        404
      );
    }
    // Now we have the appointments, let's find the services from service_id array from each appointment
    const serviceIds = appointments
      .map((appointment) => appointment.service_id)
      .flat();
    const subCategoryObjects = [];
    for (const serviceId of serviceIds) {
      const subCategory = await serviceModel.findOne(
        { "mainCategories.subCategories._id": serviceId },
        { "mainCategories.$": 1 }
      );
      if (
        subCategory &&
        subCategory.mainCategories &&
        subCategory.mainCategories.length > 0
      ) {
        const mainCategory = subCategory.mainCategories[0];
        if (
          mainCategory.subCategories &&
          mainCategory.subCategories.length > 0
        ) {
          const subCategoryObj = mainCategory.subCategories.find((subCat) =>
            subCat._id.equals(serviceId)
          );
          subCategoryObjects.push(subCategoryObj);
        }
      }
    }
    if (subCategoryObjects.length === 0) {
      throw new ErrorHandler("No sub categories found", 404);
    }
    //now we have the subCategoryObjects, let's count the number of times each service was booked
    const serviceCount = {};
    for (const subCategory of subCategoryObjects) {
      if (serviceCount[subCategory.service_name]) {
        serviceCount[subCategory.service_name]++;
      } else {
        serviceCount[subCategory.service_name] = 1;
      }
    }
    //now we have the serviceCount, let's calculate the percentage of each service
    const totalServices = subCategoryObjects.length;
    const servicesWithPercentage = Object.entries(serviceCount).map(
      ([serviceName, count]) => ({
        serviceName,
        count,
        percentage: ((count / totalServices) * 100).toFixed(2),
      })
    );
    if (!servicesWithPercentage) {
      throw new ErrorHandler("No services found", 404);
    }
    // Send response with services and their percentages
    res.json({ servicesWithPercentage });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const getStylistSalesAnalysis = async (req, res, next) => {
  try {
    // Extract salon and days from request
    const salon = req?.salon;
    const { days } = req.query;
    if (!salon || !days) {
      throw new ErrorHandler("Please provide salon id and days", 400);
    }
    // Calculate start date based on provided days
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate = startDate.toISOString().slice(0, 10);

    // Aggregate pipeline to fetch stylist sales analysis
    const results = await appointmentModel.aggregate([
      {
        $match: {
          selectedStylistId: { $in: salon.stylists }, // Match appointments with stylist IDs in the salon's stylists array
          dateforService: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$selectedStylistId",
          totalAmount: { $sum: "$final_amount" }, // Calculate total amount per stylist
        },
      },
      {
        $lookup: {
          from: "stylists",
          localField: "_id",
          foreignField: "_id",
          as: "stylistDetails",
        },
      },
      {
        $unwind: "$stylistDetails",
      },
      {
        $project: {
          stylistName: "$stylistDetails.stylist_name", // Project stylist name
          totalAmount: 1, // Include total amount
        },
      },
    ]);
    if (results.length === 0) {
      throw new ErrorHandler("No data found for stylists", 404);
    }

    // Aggregate pipeline to calculate total income within specified days
    const totalIncomeWithinNDays = await appointmentModel.aggregate([
      {
        $match: {
          dateforService: { $gte: startDate }, // Match appointments within specified days
          selectedStylistId: { $in: salon.stylists }, // Match appointments with stylist IDs in the salon's stylists array
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$final_amount" }, // Calculate total amount
        },
      },
    ]);

    // Extract total income or set to 0 if no result found
    const totalIncome =
      totalIncomeWithinNDays.length > 0
        ? totalIncomeWithinNDays[0].totalAmount
        : 0;

    // Calculate percentage of total amount for each stylist
    const stylistSalesAnalysis = results.map((stylist) => ({
      stylistName: stylist.stylistName,
      totalAmount: stylist.totalAmount,
      percentage: ((stylist.totalAmount / totalIncome) * 100).toFixed(2), // Calculate percentage
    }));
    if (!stylistSalesAnalysis) {
      throw new ErrorHandler("No sales analytics data gathered", 400);
    }
    // Send response with stylist sales analysis
    res.json({ stylistSalesAnalysis });
  } catch (error) {
    // Error handling
    next(error);
  }
};

module.exports = {
  getAppointmentandAmtPerDay,
  getSalonGeneralAnalytics,
  recentActivity,
  upcomingAppointments,
  topServicesWithinNDays,
  getStylistSalesAnalysis,
};
