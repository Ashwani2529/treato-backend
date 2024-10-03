const { ErrorHandler } = require('../utills/errorHandler')
const { salonsModel } = require("../models/salonsModel")
const { lookBookModel } = require("../models/lookBookModel");
const { default: mongoose } = require('mongoose');
const { serviceModel } = require('../models/serviceModel');

// check array validation
const validateArray = (req, arr, fieldName) => {
    // Check if stylishListIds is an array
    if (req.body[fieldName] && !Array.isArray(arr)) {
        throw new ErrorHandler(`${fieldName} is not an array. Please provide an array.`, 400);
    }
};
// check StylishIds validity with salon data
const validateStylishIds = (req, stylishIds, salonStylists, fieldName) => {
    // Find mismatched stylist IDs
    const mismatchedStylishIds = stylishIds?.filter(stylishId => !salonStylists?.includes(stylishId));
    if (req.body[fieldName] && mismatchedStylishIds?.length !== 0) {
        throw new ErrorHandler(`${mismatchedStylishIds.join(', ')} - These IDs mismatch with salon's stylist IDs.`, 400);
    }
};
// check ServiceCategory validity with salon data
const validateServiceCategory = (req, serviceCategories, salonServices, fieldName) => {
    // Check if serviceCategories is valid
    if (req.body[fieldName] && !salonServices?.includes(serviceCategories)) {
        throw new ErrorHandler(`Service category IDs mismatch with salon's services IDs.`, 400);
    }
};

// check Subcategory validity within service data
const validateSubCategoryId = (req, serviceSubCategoryId, service, fieldName) => {
    // Using flatMap to concatenate all subCategories arrays into a single array
    const subcategory = service?.mainCategories?.flatMap(category => category?.subCategories)
        .find(subcategory => subcategory?._id?.toString() === serviceSubCategoryId);

    if (req.body[fieldName] && !subcategory) {
        // If no subcategory is found with the provided subcategoryId within the service
        throw new ErrorHandler("Subcategory not found within the service", 400);
    }
};

// add look book image into db
const addLookBookImage = async (req, res, next) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            throw new ErrorHandler("No Image given!!", 400);
        }

        // Destructure variables from req.body
        const { name, description, rating, serviceCategories, serviceSubCategoryId, price, stylishListIds, salonId } = req.body;

        // Define required fields
        const requiredFields = ['name', 'description', 'rating', 'salonId', 'serviceCategories', 'serviceSubCategoryId', 'price'];

        // Validate required fields
        requiredFields.forEach(field => {
            if (!(field in req.body) || req.body[field] === "") {
                throw new ErrorHandler(`${field.charAt(0).toUpperCase() + field.slice(1)} is required!!`, 400);
            }
        });

        // Find the salon based on the provided salonId
        const salon = await salonsModel.findById({ _id: salonId });
        if (!salon) {
            throw new ErrorHandler("Salon does not exist. Wrong ID selected!!", 400);
        }

        // Check if stylishListIds is an array
        validateArray(req, stylishListIds, 'stylishListIds');
        // Find mismatched stylist IDs
        validateStylishIds(req, stylishListIds, salon?.stylists, 'stylishListIds');
        // Check if serviceCategories is valid
        validateServiceCategory(req, serviceCategories, salon?.services, 'serviceCategories');

        const service = await serviceModel.findOne({ _id: serviceCategories });

        if (serviceCategories && !service) {
            // If no service is found with the provided _id
            throw new ErrorHandler("Service not found", 400);
        }

        validateSubCategoryId(req, serviceSubCategoryId, service, "serviceSubCategoryId")

        // Create new data object for lookBookModel
        const newData = {
            name,
            description,
            photo: {
                public_url: req.file.location, // req.file contains image details
                key: req.file.key,
            },
            service_categories: serviceCategories,
            service_subcategory_id: serviceSubCategoryId,
            price,
            rating,
            salon: salonId,
            locationText: salon?.locationText,
            location: salon?.location
        }

        stylishListIds && (newData.stylists = stylishListIds)

        // Create a new lookBookImage document
        const newLookBookImage = await lookBookModel.create(newData);

        // Send response
        res.status(200).send({ status: true, data: newLookBookImage })
    } catch (error) {
        // Handle errors by passing them to the next middleware
        next(error);
    }
}

// find all data of look book
const getAllLookBook = async (req, res, next) => {
    try {
        // find all data
        const lookBookData = await lookBookModel.find({}).sort({ rating: -1 });
        res.status(200).send({ status: true, data: lookBookData });
    } catch (error) {
        next(error)
    }
}

// find specific id's data of look book
const getOneLookBook = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lookBookData = await lookBookModel.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(id) }
            },
            {
                $lookup: {
                    from: "salons",
                    localField: "salon",
                    foreignField: "_id",
                    as: "salon"
                }
            },
            {
                $lookup: {
                    from: "services",
                    localField: "service_categories",
                    foreignField: "_id",
                    as: "service"
                }
            },
            {
                $lookup: {
                    from: "stylists",
                    localField: "stylists",
                    foreignField: "_id",
                    as: "stylist"
                }
            },
            {
                $project: {
                    "photo": 1,
                    "name": 1,
                    "description": 1,
                    "rating": 1,
                    "price": 1,
                    "salon._id": 1,
                    "salon.salon_image": 1,
                    "salon.salon_name": 1,
                    "service.service_name": 1,
                    "service_categories": 1,
                    "service_subcategory_id": 1,
                    "location": "$salon.location",
                    "locationText": "$salon.locationText",
                    "stylist._id": 1, // Keep the stylist IDs
                    "stylist.stylist_name": 1, // Keep the stylist_names
                    "stylist.stylist_Img": 1, // Keep the stylist_Img
                }
            },
            {
                $limit: 1 // Limit the output to one document
            }
        ]);

        const service = await serviceModel.findById({ _id: lookBookData[0]?.service_categories.toString() });
        const subcategory = service?.mainCategories?.flatMap(category => category?.subCategories).
            find(subcategory => subcategory?._id?.toString() === lookBookData[0].service_subcategory_id.toString());

        if (subcategory) {
            lookBookData[0].serviceSubCategoryData = subcategory
        }

        res.status(200).send({ status: true, data: lookBookData });
    } catch (error) {
        next(error)
    }
}

// edit look book data based on specific id
const editLookBookImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Destructure variables from req.body
        const { name, description, rating, serviceCategories, serviceSubCategoryId, price, stylishListIds, salonId } = req.body;

        // find a data of look book by provided id
        const lookBookImage = await lookBookModel.findById({ _id: id });
        if (!lookBookImage) {
            throw new ErrorHandler("This id does not exist. Wrong id provided!!", 400);
        }
      
        req.file && (
            lookBookImage.photo = {
                public_url: req.file?.location, // req.file contains image details
                key: req.file?.key,
            }
        )

        name && (lookBookImage.name = name)
        description && (lookBookImage.description = description)
        rating && (lookBookImage.rating = rating)

        if (salonId) {
            // Find the salon based on the provided salonId
            const salon = await salonsModel.findById({ _id: salonId });
            if (!salon) {
                throw new ErrorHandler("Salon does not exist. Wrong id selected!!", 400);
            }
            salonId && (lookBookImage.salon = salonId)
            // check service categories
            if (!serviceCategories) {
                throw new ErrorHandler("Must add service category because salon has changed!!", 400);
            }

            // Check if serviceCategories is valid
            validateServiceCategory(req, serviceCategories, salon?.services, 'serviceCategories');
            serviceCategories && (lookBookImage.service_categories = serviceCategories)
            // Check if stylishListIds is an array
            validateArray(req, stylishListIds, 'stylishListIds');
            // Find mismatched stylist IDs
            validateStylishIds(req, stylishListIds, salon?.stylists, 'stylishListIds');
            stylishListIds && (lookBookImage.stylists = stylishListIds)

            const service = await serviceModel.findOne({ _id: serviceCategories });

            if (serviceCategories && !service) {
                // If no service is found with the provided _id
                throw new ErrorHandler("Service not found", 400);
            }

            validateSubCategoryId(req, serviceSubCategoryId, service, "serviceSubCategoryId")

            serviceSubCategoryId && (lookBookImage.service_subcategory_id = serviceSubCategoryId)

            lookBookImage.locationText = salon?.locationText;
            lookBookImage.location = salon?.location
        }
        else {
            // Find the existing salon from mentioned look book id
            const salon = await salonsModel.findById({ _id: lookBookImage.salon })
            // Check if serviceCategories is valid
            validateServiceCategory(req, serviceCategories, salon?.services, 'serviceCategories');

            // add serviceCategories & price
            serviceCategories && (lookBookImage.service_categories = serviceCategories)

            // Check if stylishListIds is an array
            validateArray(req, stylishListIds, 'stylishListIds');
            // Find mismatched stylist IDs
            validateStylishIds(req, stylishListIds, salon?.stylists, 'stylishListIds');

            stylishListIds && (lookBookImage.stylists = stylishListIds);
            lookBookImage.locationText = salon?.locationText;
            lookBookImage.location = salon?.location
        }
        price && (lookBookImage.price = price)

        const updateLookBook = await lookBookImage.save();
        // Send response
        res.status(200).send({ status: true, data: updateLookBook })
    } catch (error) {
        next(error)
    }
}

// delete data based on specific id
const deleteLookBookImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Find by ID and remove it from the database
        const deletedOneLookBook = await lookBookModel.deleteOne({ _id: id });

        if (!deletedOneLookBook) {
            throw new ErrorHandler("This data not found", 404);
        }

        res.status(200).json({
            status: true,
            message: "Deleted successfully"
        });
    } catch (error) {
        next(error)
    }
}

// find data based on category
const searchDataOnCategory = async (req, res, next) => {
    try {
        const { categoryName } = req.query;
        const data = await lookBookModel.aggregate([
            {
                $lookup: {
                    from: "services",
                    localField: "service_categories",
                    foreignField: "_id",
                    as: "service"
                }
            },
            {
                $match: {
                    'service.service_name': new RegExp(categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
                }
            },
            {
                $sort: {
                    rating: -1 // Sort by 'rating' field in descending order
                }
            }
        ])
        res.status(200).send({ status: true, data });
    } catch (error) {
        next(error)
    }
}

// find data based on location
const searchDataOnLocation = async (req, res, next) => {
    try {
        // Get the search query from the request query parameters
        const latitude = parseFloat(req.query.lat);
        const longitude = parseFloat(req.query.lng);
        const { location } = req.query;
        let lookBookData;

        if (!isNaN(latitude) && !isNaN(longitude)) {
            // If latitude and longitude are provided, use them
            lookBookData = await lookBookModel.find({
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [longitude, latitude],
                        },
                    },
                },
            }).sort({ rating: -1 })
        }
        else if (location) {
            // If location text is provided, use it
            lookBookData = await lookBookModel
                .find({ locationText: { $regex: new RegExp('.*' + location.toLowerCase() + '.*', 'i') } })
        }
        else {
            // Handle the case where neither coordinates nor locationText are provided
            throw new ErrorHandler("Please provide valid location or coordinates", 404);
        }
        res.status(200).send({ status: true, lookBookData });
    } catch (error) {
        next(error);
    }
}

// frontend developer Tushar did this api
const getAllLookbookLocations = async (req, res, next) => {
    try {
        // Fetch all lookbooks, project only the 'locationText' field, and sort in alphabetical order
        const lookbooks = await lookBookModel.find({}, 'locationText').sort({ locationText: 'asc' });

        // Use a Map to keep track of unique locations in a case-insensitive manner
        const uniqueLocationsMap = new Map();

        // Iterate over the lookbooks to populate the Map
        lookbooks.forEach((lookbook) => {
            const locationText = lookbook.locationText;
            const lowerCaseLocationText = locationText.toLowerCase();

            // Check if the location is already in the Map (case-insensitive check)
            if (!uniqueLocationsMap.has(lowerCaseLocationText)) {
                // If not, add it to the Map
                uniqueLocationsMap.set(lowerCaseLocationText, locationText);
            }
        });

        // Extract unique locations from the Map
        const uniqueLocations = Array.from(uniqueLocationsMap.values());

        // Send the uniqueLocations in the response
        res.status(200).json({ status: true, data: uniqueLocations });
    } catch (error) {
        next(error);
    }
};

// frontend developer Tushar did this api
const searchLookbooks = async (req, res, next) => {
    try {
        const { categoryName, location } = req.query;

        const locationRegex = new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        const data = await lookBookModel.aggregate([
            {
                $lookup: {
                    from: 'services',
                    localField: 'service_categories',
                    foreignField: '_id',
                    as: 'service'
                }
            },
            {
                $match: {
                    'service.service_name': categoryName, // Change to an exact match
                    'locationText': locationRegex
                }
            },
            {
                $sort: {
                    rating: -1
                }
            }
        ]);

        res.status(200).send({ status: true, data });
    } catch (error) {
        next(error);
    }
};

// frontend developer Tushar did this api
const searchLookbooksNearUser = async (req, res, next) => {
    try {
      const { categoryName, latitude, longitude } = req.query;
  
      // Define the user's location as a GeoJSON point
      const userLocation = {
        type: 'Point',
        coordinates: [parseFloat(latitude),parseFloat(longitude)],
      };
      // Find salon IDs near the user's location
      const salonIdsNearUser = await salonsModel.find({
        location: {
          $near: {
            $geometry: userLocation,
            $maxDistance: 300000, // Specify the maximum distance in meters (adjust as needed)
          },
        },
      }).select('_id');
      // Extract salon IDs from the result
      const salonIds = salonIdsNearUser.map(salon => salon._id);
  
      // Find lookbooks for the given category and near the user's location
      const data = await lookBookModel.aggregate([
        {
          $lookup: {
            from: 'services',
            localField: 'service_categories',
            foreignField: '_id',
            as: 'service',
          },
        },
        {
          $match: {
            'service.service_name': categoryName,
            'salon': { $in: salonIds },
          },
        },
        {
          $sort: {
            rating: -1,
          },
        },
      ]);
  
      res.status(200).send({ success: true, data });
    } catch (error) {
        next(error);
    }
};


module.exports = {
    addLookBookImage,
    getAllLookBook,
    getOneLookBook,
    editLookBookImage,
    deleteLookBookImage,
    searchDataOnCategory,
    searchDataOnLocation,
    searchLookbooksNearUser,
    searchLookbooks,
    getAllLookbookLocations
}
