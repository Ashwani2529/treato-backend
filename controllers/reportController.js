const { appointmentModel } = require("../models/appointmentModel");
const { ErrorHandler } = require("../utills/errorHandler");
const { contactUsModel } = require("../models/contactUsModel");

// Retrieve appointments based on specified criteria
const appointmentsByDays = async (req, res, next) => {
  const salon_id = req?.salon._id;
  // console.log("id",salon_id)
  if (!salon_id) {
    throw new ErrorHandler(400, "Salon ID not found");
  }
  try {
    // Get criteria from request parameters
    const { days, status, bookingType ,search} = req.query;
    if (!days) {
      throw new ErrorHandler("Please provide the number of days", 400);
    }
    // Calculate the date 'days' days ago
    let NDaysAgo = new Date();
    NDaysAgo.setDate(NDaysAgo.getDate() - days);
    NDaysAgo = NDaysAgo.toISOString().slice(0, 10);

    // Aggregate query to fetch appointments matching the criteria
   const pipeline =[
    {
      $match: {
        salons_id: salon_id,
        status: status ? status : { $ne: null },
        dateforService: { $gte: NDaysAgo },
        payment_mode: bookingType ? bookingType : { $ne: null },
      },
    },
    // Services lookup
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
    // Unwind serviceData and serviceData.subCategories arrays
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
    // Lookup orderModel and find order_id
    {
      $lookup: {
        from: "orders",
        let: { appointmentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$appointment_id", "$$appointmentId"],
              },
            },
          },
        ],
        as: "orderData",
      },
    },
    // Group by appointment ID
    {
      $group: {
        _id: "$_id",
        transactionId: { $first: "$orderData.order_id" },
        dateforService: { $first: "$dateforService" },
        userData: { $first: "$userData" },
        stylist: { $first: "$stylistData.stylist_name" },
        status: { $first: "$status" },
        payment_mode: { $first: "$payment_mode" },
        final_amount: { $first: "$final_amount" },
        services: { $addToSet: "$serviceData.subCategories.service_name" },
      },
    },
    // Project specific fields
    {
      $project: {
        _id: 0,
        dateforService: 1,
        clientName: "$userData.name",
        services: 1,
        transactionId: { $arrayElemAt: ["$transactionId", 0] },
        stylist: { $arrayElemAt: ["$stylist", 0] },
        status: 1,
        payment_mode: 1,
        final_amount: 1,
      },
    },
  ]
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { clientName: { $regex: search, $options: "i" } },
          { stylist: { $regex: search, $options: "i" } },
          { transactionId: { $regex: search, $options: "i" } },
        ],
      },
    });
  }
    const appointments = await appointmentModel.aggregate(pipeline);

    if (!appointments.length) {
      return res.status(200).json({
        status: true,
        message: "Appointments fetched successfully",
        data: appointments,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Appointments fetched successfully",
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

// Generate a report of clients including their details, total amount spent, and last visit
const clientsReport = async (req, res, next) => {
  // Extract salon ID from request
  const salon_id = req?.salon?._id;
  if (!salon_id) {
    throw new ErrorHandler(400, "Salon ID not found");
  }
  try {
    //document based on email and gender
    const {email,gender}=req.query
    // Aggregate query to generate client report
    const pipeline= [
      // Match appointments for the specific salon
      { $match: { salons_id: salon_id } },
      // Group appointments by user ID
      {
        $group: {
          _id: "$user_id",
          totalAmount: { $sum: "$final_amount" }, // Calculate total amount spent
          lastVisit: { $max: "$dateforService" }, // Get the latest visit date
        },
      },
      // Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userData",
        },
      },
      // Unwind user data
      { $unwind: "$userData" },
      // Project client details along with total amount and last visit date
      {
        $project: {
          _id: 0,
          clientDetails: {
            first_name: "$userData.first_name",
            last_name: "$userData.last_name",
            email: "$userData.email",
            gender: "$userData.gender",
            dob: "$userData.dob",
          },
          totalAmount: 1,
          lastVisit: 1,
        },
      },
      // Lookup top service for each client
      {
        $lookup: {
          from: "services",
          let: { userId: "$_id" },
          pipeline: [
            // Unwind subCategories array
            { $unwind: "$mainCategories.subCategories" },
            // Lookup service appointments count
            {
              $lookup: {
                from: "appointments",
                let: {
                  serviceId: "$mainCategories.subCategories._id",
                  userId: "$$userId",
                },
                pipeline: [
                  // Match appointments for the specific user and service
                  {
                    $match: {
                      $expr: {
                        $eq: ["$user_id", "$$userId"],
                        $eq: ["$service_id", "$$serviceId"],
                      },
                      salons_id: salon_id,
                    },
                  },
                  // Group appointments to count
                  { $group: { _id: null, count: { $sum: 1 } } },
                ],
                as: "serviceAppointments",
              },
            },
            // Unwind serviceAppointments array
            { $unwind: "$serviceAppointments" },
            // Sort by appointment count in descending order
            { $sort: { "serviceAppointments.count": -1 } },
            // Limit to the top service
            { $limit: 1 },
            // Project service name
            {
              $project: {
                _id: 0,
                service_name: "$mainCategories.subCategories.service_name",
              },
            },
          ],
          as: "topService",
        },
      },
      // Unwind topService array
      { $unwind: { path: "$topService", preserveNullAndEmptyArrays: true } },
    ]

    //here checking if email or gender have value then push on pipeline array with match query 
    if (email || gender) {
      const matchQuery = {};
      if (email) matchQuery["clientDetails.email"] = email;
      if (gender) matchQuery["clientDetails.gender"] = gender;
      pipeline.push({ $match: matchQuery });
    }
    const data = await appointmentModel.aggregate(pipeline);
    if (!data) {
      throw new ErrorHandler("No clients found", 404);
    }

    // Send response with the generated report
    res.json({ success: true, data });
  } catch (error) {
    // Handle errors
    next(error);
  }
};

// Get appointments of a day by stylist of a salon
const calenderReport = async (req, res, next) => {
  try {
    const salon_id = req?.salon?._id;
    console.log("this is salon id",salon_id)
    const { date } = req.params;

    // Aggregate query to fetch appointments for a specific date
    const appointments = await appointmentModel.aggregate([
      {
        $match: {
          salons_id: salon_id,
          dateforService: date ? date : new Date().toISOString().slice(0, 10),
        },
      },
      // Services lookup
      {
        // Unwind the service_id array to handle empty arrays
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
                color: { $first: "$mainCategories.color" }, // Include color field
              },
            },
            // Project to exclude _id and shape the output
            {
              $project: {
                _id: 0,
                subCategories: 1,
                color: 1,
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
      // Group appointments
      {
        $group: {
          _id: "$_id",
          stylist: { $first: "$stylistData" },
          services: { $addToSet: "$serviceData.subCategories" },
          time: { $first: "$time" },
          color: { $first: "$serviceData.color" }, // Include color field
        },
      },
      // Project to shape the output
      {
        $project: {
          _id: 0,
          stylistName: { $arrayElemAt: ["$stylist.stylist_name", 0] },
          stylistId: { $arrayElemAt: ["$stylist._id", 0] },
          stylistImage: { $arrayElemAt: ["$stylist.stylist_Img", 0] },
          services: 1,
          time: 1,
          color: 1, 
        },
      },
    ]);
    if (!appointments.length) {
      throw new ErrorHandler("No appointments found", 404);
    }

    return res.status(200).json({
      status: true,
      message: "Calender data fetched successfully",
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = calenderReport;


const contactUs = async (req, res, next) => {
  try {
    const { first_name, last_name, email, message,phonenumber,isAcceptPrivacy} = req.body;
    if (!first_name || !last_name || !email || !message) {
      throw new ErrorHandler(400, "Please provide all the details");
    }
    const contactUs = new contactUsModel({
      first_name,
      last_name,
      email,
      message,
      phonenumber,
      isAcceptPrivacy
      });
    await contactUs.save();
    res.json({
      success: true,
      message: "Contact us details saved successfully",
      data: contactUs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  appointmentsByDays,
  clientsReport,
  calenderReport,
  contactUs,
};
