const mongoose = require("mongoose");
const { salonsModel } = require("../models/salonsModel");
const { serviceModel } = require("../models/serviceModel");
const { ErrorHandler } = require("../utills/errorHandler");
const { generateSlots } = require("./utilityFunctions/createTimeSlots");

const createSalons = async (req, res, next) => {
  const user = req?.user;
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }
  try {
    const {
      salon_name,
      website,
      services_provided,
      salons_description,
      salons_address,
      locationText,
      location_details,
      location,
      working_hours,
    } = req.body;
    if (!salon_name) {
      throw new ErrorHandler("Salon Name is required", 400);
    }
    const existingSalons = await salonsModel.find({ salon_email: user.email });
    if (existingSalons.length > 0) {
      throw new ErrorHandler("Salon already exists", 409);
    }

    const salonData = {
      user: user._id,
      salon_name,
      salons_description,
      salons_address,
      website,
      services_provided,
      locationText,
      location,
      location_details,
      salons_phone_number: user.phone,
      salon_email: user.email,
      working_hours,
    };

    // Create and save the salon
    const newSalon = await salonsModel.create(salonData);
    if (!newSalon) {
      throw new ErrorHandler("Salon not created", 400);
    }

    return res.status(200).json({
      success: true,
      message: "Salon Created Successfully",
      data: newSalon, // Optionally return the created salon
    });
  } catch (error) {
    next(error);
  }
};

const getSalons = async (req, res, next) => {
  try {
    const salons = await salonsModel
      .find({})
      .sort({ rating: -1 })
      .populate({
        path: "services", // Field to populate
        model: "services", // Model to reference
      })
      .populate({
        path: "stylists", // Field to populate
        model: "stylist", // Model to reference
      })
      .exec();

    if (!salons || salons.length === 0) {
      throw new ErrorHandler("No salon exists", 400);
    }

    res.status(200).json({
      success: true,
      salons,
    });
  } catch (error) {
    next(error);
  }
};

//API to upload images
const uploadImages = async (req, res, next) => {
  try {
    const salonId = req?.salon._id;
    const salon = await salonsModel.findById(salonId);
    if (!salon) {
      throw new ErrorHandler("Salon not found", 404);
    }
    if (!req.files) {
      throw new ErrorHandler("No Salon Image given!!", 400);
    }
    const salonImages = [];
    req.files.forEach((file) => {
      salonImages.push({
        public_url: file.location,
        key: file.key,
      });
    });
    salon.salon_Img.push(...salonImages);
    await salon.save();
    res
      .status(200)
      .json({ message: "Images uploaded successfully", salonImages });
  } catch (error) {
    next(error);
  }
};

//API to update salon_Img
//API to update salon_Img
const updateSalonImg = async (req, res, next) => {
  const salonId = req?.salon?._id;
  try {
    const salon = await salonsModel.findById(salonId);
    const imageKey = req.query.key;
    if (!salon) {
      throw new ErrorHandler("Salon not found", 404);
    }
    if (!req.file) {
      throw new ErrorHandler("No Salon Image given!!", 400);
    }

    // Find the image object to update by its key
    const imageToBeUpdated = salon.salon_Img.find(
      (image) => image.key === imageKey
    );
    if (!imageToBeUpdated) {
      throw new ErrorHandler("Image not found, wrong key", 404);
    }

    // Update the public_url of the image object
    imageToBeUpdated.public_url = req.file.location;
    await salon.save();
    res
      .status(200)
      .json({ message: "Image updated successfully", imageToBeUpdated });
  } catch (error) {
    next(error);
  }
};

const deleteSalonImg = async (req, res, next) => {
  const salonId = req?.salon._id;

  try {
    const salon = await salonsModel.findById(salonId);
    const imageKey = req.query.key;

    if (!salon) {
      throw new ErrorHandler("Salon not found", 404);
    }
    // Find the index of the image to be deleted in the salon_Img array
    const indexToDelete = salon.salon_Img.findIndex(
      (image) => image.key === imageKey
    );

    if (indexToDelete === -1) {
      throw new ErrorHandler("Image not found, wrong key", 404);
    }

    // Remove the image from the salon_Img array
    salon.salon_Img.splice(indexToDelete, 1);

    // Save the updated salon document
    await salon.save();

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const markImagePrimary = async (req, res, next) => {
  const salonId = req?.salon._id;
  try {
    const salon = await salonsModel.findById(salonId);
    if (!salon) {
      throw new ErrorHandler("Salon not found", 404);
    }
    const imageKey = req.query.key;
    //mark the previous isPrimary image as False
    const previousPrimaryImage = salon.salon_Img.find(
      (image) => image.isPrimary === true
    );
    if (previousPrimaryImage) {
      previousPrimaryImage.isPrimary = false;
    }
    const imageToBeUpdated = salon.salon_Img.find(
      (image) => image.key === imageKey
    );
    if (!imageToBeUpdated) {
      throw new ErrorHandler("Image not found, wrong key", 404);
    }
    imageToBeUpdated.isPrimary = true;
    await salon.save();
    res
      .status(200)
      .json({
        message: "Image marked as primary successfully",
        imageToBeUpdated,
      });
  } catch (error) {
    next(error);
  }
};

const searchSalonsLocation = async (req, res, next) => {
  try {
    // Get the search query from the request query parameters
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lng);
    const { service, location, salonName } = req.query; // Add salonName query parameter

    let matchingSalons;

    if (!isNaN(latitude) && !isNaN(longitude)) {
      // If latitude and longitude are provided, use them
      matchingSalons = await salonsModel
        .find({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              $maxDistance: 1000, // Adjust the max distance as needed
            },
          },
        })
        .sort({ rating: -1 })
        .select("salon_img salon_name rating locationText");
    } else if (location) {
      // If location text is provided, use it
      matchingSalons = await salonsModel.find({
        locationText: {
          $regex: new RegExp(".*" + location.toLowerCase() + ".*", "i"),
        },
      });
    } else if (service) {
      const services = await serviceModel.find({
        service_name: {
          $regex: new RegExp(".*" + service.toLowerCase() + ".*", "i"),
        },
      });

      if (services.length === 0) {
        // Handle the case where no matching services were found
        throw new ErrorHandler("No service found", 404);
      }

      // Extract the service IDs from the found services
      const serviceIds = services.map((service) => service._id);
      matchingSalons = await salonsModel.find({
        services: { $in: serviceIds },
      });
      //.select("salon_img salon_name rating locationText");
    } else if (salonName) {
      // If salonName is provided, use it for filtering
      matchingSalons = await salonsModel.find({
        salon_name: {
          $regex: new RegExp(".*" + salonName.toLowerCase() + ".*", "i"),
        },
      });
    } else {
      // Handle the case where neither coordinates nor locationText are provided
      throw new ErrorHandler(
        "Please provide valid location or coordinates",
        404
      );
    }

    res.status(200).json({
      success: true,
      matchingSalons,
    });
  } catch (err) {
    next(err);
  }
};

const getLocationSuggestions = async (req, res, next) => {
  try {
    // Get the search query for location suggestions from the request query parameters
    const { locationQuery } = req.query;

    if (!locationQuery) {
      // Handle the case where the locationQuery is not provided
      throw new ErrorHandler("Please provide a location query", 400);
    }

    // Find locationText values that match the provided locationQuery (case-insensitive)
    const suggestions = await salonsModel
      .find({ locationText: { $regex: new RegExp(locationQuery, "i") } })
      .distinct("locationText");

    res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (err) {
    next(err);
  }
};

const serviceVenueAndLocationSearch = async (req, res, next) => {
  try {
    const { service, address, location } = req.query;

    let getServiceId = await serviceModel.find({ service_name: service });

    const ids = getServiceId.map((service) => service._id);

    // If service and location are provided
    if (service && location) {
      salons = await salonsModel
        .find({
          locationText: {
            $regex: new RegExp(".*" + location.toLowerCase() + ".*", "i"),
          },
          services: { $in: [ids.toString()] },
        })
        .populate("services");

      if (!salons) {
        throw new ErrorHandler("No Matching Salon Found", 400);
      }
    } else if (service) {
      salons = await salonsModel
        .find({
          services: { $in: [ids.toString()] },
        })
        .populate("services");
    } else if (location) {
      salons = await salonsModel
        .find({
          locationText: {
            $regex: new RegExp(".*" + location.toLowerCase() + ".*", "i"),
          },
        })
        .populate("services");
    } else if (address && location) {
      salons = await salonsModel
        .find({
          locationText: {
            $regex: new RegExp(".*" + location.toLowerCase() + ".*", "i"),
          },
          salons_address: {
            $regex: new RegExp(".*" + address.toLowerCase() + ".*", "i"),
          },
        })
        .populate("services");
    } else if (address) {
      salons = await salonsModel
        .find({
          salons_address: {
            $regex: new RegExp(".*" + address.toLowerCase() + ".*", "i"),
          },
        })
        .populate("services");
    } else {
      throw new ErrorHandler("Please Enter a Parameter For Search", 400);
    }

    res.status(200).json({
      success: true,
      salons,
    });
  } catch (err) {
    next(err);
  }
};

const getTotalRatingsForSalon = async (salonId) => {
  try {
    const result = await salonsModel.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(salonId), // Match the specific salon by its _id
        },
      },
      {
        $project: {
          totalRatings: {
            $size: "$reviews", // Calculate the total number of ratings (size of the reviews array)
          },
        },
      },
    ]);

    if (result.length > 0) {
      return result[0].totalRatings; // Return the total number of ratings for the salon
    } else {
      return 0; // Return 0 if the salon with the given ID is not found
    }
  } catch (error) {
    throw error;
  }
};

const updateSalons = async (req, res, next) => {
  try {
    const id = req?.salon._id;
    if (!id) {
      throw new ErrorHandler("Salon not found", 404);
    }
    const fieldsToUpdate = [
      "services",
      "stylists",
      "salon_name",
      "salons_description",
      "salons_address",
      "services_provided",
      "website",
      "location_details",
      "locationText",
      "location",
      "location_details",
      "salons_phone_number",
      "bank_details",
      "working_hours",
      "isClosed",
      "salon_offers",
      "salons_logo",
      "banner",
      "social_media_url",
      "reviews",
      "salots_gap",
      "rating",
      "venue_type",
    ];

    let updatedSalonData = {};
    fieldsToUpdate.forEach((field) => {
      if (req.body.hasOwnProperty(field)) {
        updatedSalonData[field] = req.body[field];
      }
    });
    // Check if a new image file was provided in the request

    // Find and update the salon document
    const updatedSalon = await salonsModel.findOneAndUpdate(
      { _id: id },
      updatedSalonData,
      { new: true } // Return the updated document
    );

    if (!updatedSalon) {
      throw new ErrorHandler("Salon not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Salon updated successfully",
      data: updatedSalon,
    });
  } catch (error) {
    next(error);
  }
};

const getSalonById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const salon = await salonsModel
      .findById(id)
      .populate({
        path: "services", // Field to populate
        model: "services", // Model to reference
      })
      .populate({
        path: "stylists", // Field to populate
        model: "stylist", // Model to reference
      })
      .exec();
    if (!salon) {
      throw new ErrorHandler("Salon not found", 404);
    }

    res.status(200).json({
      success: true,
      salon,
    });
  } catch (error) {
    next(error);
  }
};
const getOneSalon = async (req, res, next) => {
  try {
    const salonId = req?.salon._id;
    const salon = await salonsModel
      .findById(salonId)
      .populate({
        path: "services", // Field to populate
        model: "services", // Model to reference
      })
      .populate({
        path: "stylists", // Field to populate
        model: "stylist", // Model to reference
      })
      .exec();
    if (!salon) {
      throw new ErrorHandler("Salon not found", 404);
    }

    res.status(200).json({
      success: true,
      salon,
    });
  } catch (error) {
    next(error);
  }
};

// const getSalonBank
//tushar made this
const getSalonLocations = async (req, res, next) => {
  try {
    // Fetch all salons, project only the 'locationText' field, and sort in alphabetical order
    const salons = await salonsModel
      .find({}, "locationText")
      .sort({ locationText: "asc" });

    // Use a Map to keep track of unique locations in a case-insensitive manner
    const uniqueLocationsMap = new Map();

    // Iterate over the salons to populate the Map
    salons.forEach((salon) => {
      const locationText = salon.locationText;
      const lowerCaseLocationText = locationText.toLowerCase();

      // Check if the location is already in the Map (case-insensitive check)
      if (!uniqueLocationsMap.has(lowerCaseLocationText)) {
        // If not, add it to the Map
        uniqueLocationsMap.set(lowerCaseLocationText, locationText);
      }
    });

    // Extract unique locations from the Map
    const uniqueLocations = Array.from(uniqueLocationsMap.values());
    res.status(200).json({ status: true, data: uniqueLocations });
  } catch (error) {
    next(error);
  }
};

const getSalonByLatLngService = async (req, res, next) => {
  try {
    const { service, latitude, longitude } = req.query;
    let salons;
    if (latitude && longitude && service) {
      // If all three parameters are provided (latitude, longitude, and service)

      let getServiceId = await serviceModel.find({
        service_name: { $regex: new RegExp(service, "i") },
      });

      const serviceIds = getServiceId.map((service) => service._id);

      if (!serviceIds.length) {
        throw new ErrorHandler("Service not found", 404);
      }
      const userLocation = {
        type: "Point",
        coordinates: [parseFloat(latitude), parseFloat(longitude)],
      };
      salons = await salonsModel
        .find({
          location: {
            $near: {
              $geometry: userLocation,
              $maxDistance: 100000, // Specify the maximum distance in meters (adjust as needed)
            },
          },
          services: { $in: serviceIds },
        })
        .populate("services");
      if (!salons.length) {
        throw new ErrorHandler("No matching salons found", 404);
      }
    } else if (service) {
      // If only the service parameter is provided
      let getService = await serviceModel.find({
        service_name: { $regex: new RegExp(service, "i") },
      });
      if (!Array.isArray(getService) || getService.length === 0) {
        throw new ErrorHandler("Service Not Found", 400);
      }

      salons = await salonsModel.find({
        services: { $in: [getService[0]._id.toString()] },
      });
    } else if (latitude && longitude) {
      // If only latitude and longitude are provided

      // If latitude and longitude are provided, use them
      salons = await salonsModel
        .find({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [latitude, longitude],
              },
              $maxDistance: 100000, // Adjust the max distance as needed
            },
          },
        })
        .sort({ rating: -1 });
      if (salons.length == 0) {
        throw new ErrorHandler("Salon Not Found", 400);
      }
    }

    res.status(200).json({
      success: true,
      salons,
    });
  } catch (err) {
    next(err);
  }
};

const slotsByDay = async (req, res, next) => {
  try {
    const salon = req?.salon;
    if (!salon) {
      throw new ErrorHandler("Salon not found", 404);
    }
    //let's generate all slots using working_hours of salon
    const gap = salon.salots_gap;
    const workingHours = salon.working_hours;
    if (!gap || !workingHours) {
      throw new ErrorHandler("Working Hours or Gap not found", 404);
    }
    const slotsPerDay = generateSlots(gap, workingHours);
    if (!slotsPerDay) {
      throw new ErrorHandler("Slots not generated", 404);
    }
    return res.status(200).json({ success: true, slotsPerDay });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSalons,
  getSalons,
  searchSalonsLocation,
  getLocationSuggestions,
  serviceVenueAndLocationSearch,
  getTotalRatingsForSalon,
  updateSalons,
  getOneSalon,
  getSalonById,
  getSalonLocations,
  getSalonByLatLngService,
  updateSalonImg,
  deleteSalonImg,
  markImagePrimary,
  uploadImages,
  slotsByDay,
};
