const { serviceModel } = require("../models/serviceModel");
const { ErrorHandler } = require("../utills/errorHandler");
const { stylistModel } = require("../models/stylistModel");
const { salonsModel } = require("../models/salonsModel");
const mongoose = require("mongoose");

const createServices = async (req, res, next) => {
  // Extracting salonId from the request object
  const salonId = req?.salon._id;
  try {
    // Destructuring necessary fields from the request body
    const { service_name, service_description, stylists, mainCategories } =
      req.body;
    if (!service_name) {
      throw new ErrorHandler("Service name is required", 400);
    }
    // Creating a new service instance
    const newService = await serviceModel.create({
      salonId,
      service_name,
      // Setting service image details
      service_img: {
        public_url: req.file.location, // Image URL obtained from the request file
        key: req.file.key, // Image key obtained from the request file
      },
      service_description,
      mainCategories,
    });

    // Saving the new service instance
    await newService.save();
    const salon = await salonsModel.findById(salonId);
    salon.services.push(newService._id);
    await salon.save();
    // Convert stylist IDs to ObjectIDs
    const stylistIdsArray = stylists.map(
      (stylistId) => new mongoose.Types.ObjectId(stylistId)
    );

    // Search for stylists using the extracted IDs
    const foundStylists = await stylistModel.find({
      _id: { $in: stylistIdsArray }, // Finding stylists whose IDs are in the array
    });
    if (foundStylists.length === 0) {
      throw new ErrorHandler("No stylist found", 404);
    }
    // Update each stylist with the service ID and related information
    for (const stylist of foundStylists) {
      newService.mainCategories.forEach((category) => {
        category.subCategories.forEach((subCategory) => {
          // Adding service details to stylist's service list
          // stylist.stylist_service.push(subCategory.service_name);
          // Adding service ID to stylist's service list
          stylist.services.push(subCategory._id);
        });
      });
      // Saving the updated stylist
      await stylist.save();
    }

    // Sending success response with the created service data
    res.status(200).json({
      success: true,
      message: "Service Created Successfully",
      data: newService,
    });
  } catch (err) {
    // Handling errors
    next(err);
  }
};

const addNewSubcategory = async (req, res, next) => {
  try {
    const { serviceId, mainCategoryId, subCategoryData, stylists } = req.body;

    //Find the service by its ID
    const service = await serviceModel.findById(serviceId);
    if (!service) {
      throw new ErrorHandler("Service not found", 404);
    }

    //Find the main category within the service
    const mainCategory = service.mainCategories.find(
      (category) => category._id.toString() === mainCategoryId
    );
    if (!mainCategory) {
      throw new ErrorHandler("Main category not found", 404);
    }

    //Add the new subcategories to the main category
    for (const subcategory of subCategoryData) {
      mainCategory.subCategories.push(subcategory);
    }

    //Save the updated service with new subcategories
    await service.save();

    //Retrieve the updated main category array
    const mainCategoryArray = service.mainCategories.find(
      (category) => category._id.toString() === mainCategoryId
    );

    //Search for stylists using provided IDs
    const stylistIdsArray = stylists.map(
      (stylistId) => new mongoose.Types.ObjectId(stylistId)
    );
    const foundStylists = await stylistModel.find({
      _id: { $in: stylistIdsArray },
    });
    if (foundStylists.length === 0) {
      throw new ErrorHandler("No stylist found", 404);
    }
    //Update each stylist with the new service ID and subcategory details
    for (const stylist of foundStylists) {
      for (const subcategory of subCategoryData) {
        // Find the corresponding subcategory ID within the main category array
        const subcategoryID = mainCategoryArray.subCategories.find(
          (subCategoryObj) =>
            subCategoryObj.service_name === subcategory.service_name &&
            subCategoryObj.price === subcategory.price
        );
        if (!subcategoryID) {
          throw new ErrorHandler("Subcategory not found", 404);
        }
        // Adding subcategory details to stylist's service list
        // stylist.stylist_service.push(subcategory.service_name);
        // Adding subcategory ID to stylist's service list
        stylist.services.push(subcategoryID._id);
      }
      // Save the updated stylist
      await stylist.save();
    }

    //Send success response with the updated service
    res
      .status(200)
      .json({ message: "New subcategories added successfully", service });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const addNewCategory = async (req, res, next) => {
  // Extracting salonId from the request object
  const salonId = req?.salon._id;
  try {
    const { serviceId, mainCategoryData } = req.body;
    // If no serviceId provided, create a new service
    if (!serviceId) {
      throw new ErrorHandler("ServiceId required", 403);
    }
    const salon = await salonsModel.findById(salonId);
    const service = await serviceModel.findById(serviceId);
    // Find the service by its ID
    const serviceExistence = !!salon.services.find(
      (service) => service._id.toString() === serviceId
    );
    if (!serviceExistence) {
      // throw new ErrorHandler("Service not found", 404);
      //service doesn't exist in this particular salon so we have to fetch it from serviceModel and add to salon's services
      // const service = await serviceModel.findById(serviceId);
      const newService = await serviceModel.create({
        salonId,
        service_name: service.service_name,
        service_description: service.service_description,
        service_img: service.service_img,
        price: service.price,
        mainCategories: mainCategoryData,
        service_timing: service.service_timing,
      });
      // Save the new service instance
      await newService.save();
      salon.services.push(newService._id);
      await salon.save();
      return res.status(200).json({
        success: true,
        message: "New Service added to salon Successfully",
        data: newService,
      });
    }

    //Add the new main category to the mainCategories array
    service.mainCategories.push(mainCategoryData);

    //Save the updated service with the new main category
    await service.save();

    // Sending success response with the updated service
    res
      .status(200)
      .json({ message: "New main category added successfully", service });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const listServices = async (req, res, next) => {
  // const salon= req?.salon._id;
  try {
    const services = await serviceModel.find({});

    if (!services) {
      throw new ErrorHandler("No Service exist", 400);
    }

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

const searchServices = async (req, res, next) => {
  //http://localhost:4000/api/v1/distributor/search?query=Diya
  try {
    // Get the search query from the request query parameters
    const { query } = req.query;

    if (!query) {
      throw new ErrorHandler("Search query is required", 400);
    }

    const searchResults = await serviceModel.find({
      service_name: { $regex: query, $options: "i" }, // Case-insensitive search using $regex
    });

    //if no search found
    if (searchResults.length === 0) {
      throw new ErrorHandler("No matching Service found", 404);
    }
    //return response
    res.status(200).json({
      success: true,
      data: searchResults,
    });
  } catch (err) {
    next(err);
  }
};

const searchSalonsLocation = async (req, res, next) => {
  //http://localhost:4000/api/v1/distributor/search?query=Diya
  try {
    // Get the search query from the request query parameters
    const { query } = req.query;

    if (!query) {
      throw new ErrorHandler("Search query is required", 400);
    }

    const searchResults = await serviceModel.find({
      service_name: {
        $regex: new RegExp(".*" + query.toLowerCase() + ".*", "i"),
      }, // Case-insensitive search using $regex
    });

    //if no search found
    if (searchResults.length === 0) {
      throw new ErrorHandler("No matching Service found", 404);
    }

    //return response
    res.status(200).json({
      success: true,
      data: searchResults,
    });
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { serviceId, mainCategoryId } = req.params;

    //Find the service by its ID
    const service = await serviceModel.findById(serviceId);
    if (!service) {
      throw new ErrorHandler("Service not found", 404);
    }

    //Find the main category within the service
    const mainCategory = service.mainCategories.find(
      (category) => category._id.toString() === mainCategoryId
    );
    if (!mainCategory) {
      throw new ErrorHandler("Main category not found", 404);
    }

    // Remove the main category from the mainCategories array
    service.mainCategories.pull(mainCategory);

    //Save the updated service without the deleted main category
    await service.save();

    //Send success response with the deleted main category
    res
      .status(200)
      .json({ message: "Main category deleted successfully", mainCategory });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const deleteSubCategory = async (req, res, next) => {
  try {
    // Extracting parameters from the request
    const { serviceId, mainCategoryId, subCategoryId } = req.params;

    // Finding the service by its ID
    const service = await serviceModel.findById(serviceId);
    if (!service) {
      throw new ErrorHandler("Service not found", 404);
    }

    // Finding the main category within the service
    const mainCategory = service.mainCategories.find(
      (category) => category._id.toString() === mainCategoryId
    );
    if (!mainCategory) {
      throw new ErrorHandler("Main category not found", 404);
    }

    // Finding the subcategory within the main category
    const subCategory = mainCategory.subCategories.find(
      (subCategory) => subCategory._id.toString() === subCategoryId
    );
    if (!subCategory) {
      throw new ErrorHandler("Sub category not found", 404);
    }

    // Removing the subcategory from the subCategories array of the main category
    mainCategory.subCategories.pull(subCategory);

    // Saving the updated service without the deleted subcategory
    await service.save();

    // Sending success response with the deleted subcategory
    res
      .status(200)
      .json({ message: "Sub category deleted successfully", subCategory });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const editCategory = async (req, res, next) => {
  const salonId = req?.salon._id;
  try {
    const { serviceId, mainCategoryId, newCategoryName } = req.body;

    // Find the service by its ID
    const salon = await salonsModel.findById(salonId);
    const sId = salon.services.find(
      (service) => service._id.toString() === serviceId
    );
    const service = await serviceModel.findOne({ _id: sId });
    if (!service) {
      throw new ErrorHandler("Service not found", 404);
    }
    // Find the main category by its ID
    const mainCategory = service.mainCategories.id(mainCategoryId);
    if (!mainCategory) {
      throw new ErrorHandler("Main category not found", 404);
    }
    mainCategory.category_name = newCategoryName;
    //save it
    await service.save();
    // Send success response with the updated main category
    res
      .status(200)
      .json({ message: "Main category updated successfully", mainCategory });
  } catch (error) {
    next(error);
  }
};

const editSubCategory = async (req, res, next) => {
  const salonId = req?.salon._id;
  try {
    const {
      serviceId,
      mainCategoryId,
      subCategoryId,
      subCategoryData,
      oldStylist,
      newStylist,
    } = req.body;

    // Find the service by ID
    const salon = await salonsModel.findById(salonId);
    const sId = salon.services.find(
      (service) => service._id.toString() === serviceId
    );
    const service = await serviceModel.findOne({ _id: sId });
    if (!service) {
      throw new ErrorHandler("Service not found", 404);
    }

    // Find the main category within the service
    const mainCategory = service.mainCategories.find(
      (category) => category._id.toString() === mainCategoryId
    );
    if (!mainCategory) {
      throw new ErrorHandler("Main category not found", 404);
    }
    // Find the subcategory by ID within the main category
    let subCategory = mainCategory.subCategories.id(subCategoryId);
    if (!subCategory) {
      throw new ErrorHandler("Sub category not found", 404);
    }
    //Update subcategory with new data
    for (const key in subCategoryData) {
      subCategory[key] = subCategoryData[key];
    }

    // Save the updated service with the new subcategory
    await service.save();
    // Update stylists' services array
    const oldStylistSet = new Set(oldStylist);
    const newStylistSet = new Set(newStylist);
    // Find all stylist documents in one query
    const stylistIdsToUpdate = [...oldStylistSet, ...newStylistSet];
    if (stylistIdsToUpdate.length === 0) {
      // No stylist to update, so exit the function
      return;
    }

    const stylistDocs = await stylistModel.find({
      _id: { $in: stylistIdsToUpdate },
    });
    if (!stylistDocs) {
      throw new ErrorHandler("Stylist not found", 404);
    }
    for (const stylistdoc of stylistDocs) {
      const isOldStylist = oldStylistSet.has(stylistdoc._id);
      const isNewStylist = newStylistSet.has(stylistdoc._id);

      if (isOldStylist && !isNewStylist) {
        stylistdoc.services.pull(subCategoryId);
      } else if (isNewStylist && !isOldStylist) {
        stylistdoc.services.push(subCategoryId);
      } else {
        //it means the stylist is in both old and new stylist array
        continue;
      }

      await stylistdoc.save();
    }
    // Send success response with the updated subcategory
    res
      .status(200)
      .json({ message: "Sub category updated successfully", subCategory });
  } catch (error) {
    // Error handling
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Find the service by ID and remove it from the database
    const deletedService = await serviceModel.deleteOne({ _id: id });

    if (!deletedService) {
      throw new ErrorHandler("Service not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { service_name, service_description, mainCategories } = req.body;
    if (!id) {
      throw new ErrorHandler("ServiceId required", 403);
    }
    //   Check if a new image file was provided in the request
    let updateFields = {
      service_name,
      service_description,
      mainCategories,
      modified: Date.now(),
    };

    if (req.file) {
      updateFields.service_img = {
        public_url: req.file.location,
        key: req.file.key,
      };
    }

    //Find and update the service document
    const updatedService = await serviceModel.findOneAndUpdate(
      { _id: id },
      updateFields,
      { new: true } // Return the updated document
    );

    if (!updatedService) {
      throw new ErrorHandler("Service not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

const getOneService = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the service by ID and remove it from the database
    const service = await serviceModel.find({ _id: id });

    if (service.length == 0) {
      throw new ErrorHandler("Service not found", 404);
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (err) {
    next(err);
  }
};

const getServiceNameSuggestions = async (req, res, next) => {
  try {
    // Get the search query for service_name suggestions from the request query parameters
    const { serviceQuery } = req.query;

    if (!serviceQuery) {
      // Handle the case where the serviceQuery is not provided
      throw new ErrorHandler("Please provide a service query", 400);
    }

    // Find service_name values that match the provided serviceQuery (case-insensitive)
    const suggestions = await serviceModel
      .find({ service_name: { $regex: new RegExp(serviceQuery, "i") } })
      .distinct("service_name");

    res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createServices,
  listServices,
  searchServices,
  searchSalonsLocation,
  deleteService,
  updateService,
  getOneService,
  getServiceNameSuggestions,
  addNewCategory,
  addNewSubcategory,
  deleteCategory,
  deleteSubCategory,
  editCategory,
  editSubCategory,
};
