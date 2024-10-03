const mongoose = require("mongoose");
const { ErrorHandler } = require('../utills/errorHandler')
const { serviceModel } = require('../models/serviceModel')
const { homepageCMSModel } = require('../models/homepageCMS.js')

// check value, length and assign if exist
function assignIfExist(fieldValue, destination, field, maxLength = null) {
    if (fieldValue) {
        if (maxLength !== null && fieldValue.length > maxLength) {
            throw new ErrorHandler(`${field} length maximum ${maxLength} characters`, 403);
        }
        destination[field] = fieldValue;
    }
}

// Processes and validates the request body fields for a specific purpose.
const processRequestBody = async (body, dataObject, method, req) => {
    const {
        main_heading,
        service_id,
        downloadApp_heading,
        downloadApp_subheading,
        partner_heading,
        partner_subheading,
        testimonial,
        contact_us_image
    } = body;

    // main heading check for first new data with post method
    if (!main_heading && method === 'post') {
        throw new ErrorHandler("At least main heading required with maximum length 43 characters!", 403);
    }

    // check main heading exist and add in object
    assignIfExist(main_heading, dataObject, "main_heading", 43)

    // Check service id data and add it to the "dataObject"
    if (service_id && Array.isArray(service_id)) {
        if (service_id.length < 7) {
            throw new ErrorHandler("At least 7 services needs to be added!", 409);
        }
        const existingServices = await serviceModel.find({
            _id: {
                $in: service_id.map((id) => new mongoose.Types.ObjectId(id)),
            },
        });

        if (existingServices.length !== service_id.length) {
            throw new ErrorHandler("One or more services does not exist", 409);
        }
        dataObject.service_id = service_id;
    }

    // check download app section data
    if (downloadApp_heading || downloadApp_subheading) {
        dataObject.downloadApp_section = {};
        assignIfExist(downloadApp_heading, dataObject.downloadApp_section, 'downloadApp_heading', 30)
        assignIfExist(downloadApp_subheading, dataObject.downloadApp_section, 'downloadApp_subheading', 96)
    }
    // check partner section data
    if (partner_heading || partner_subheading) {
        dataObject.partner_section = {};
        assignIfExist(partner_heading, dataObject.partner_section, 'partner_heading', 16)
        assignIfExist(partner_subheading, dataObject.partner_section, 'partner_subheading', 128)
    }

    // check contact us image data
    if (req.file) {
        dataObject.contact_us_image = {
            public_url: req.file.location,
            key: req.file.key
        }
    }

    assignIfExist(testimonial, dataObject, 'testimonial')
    assignIfExist(contact_us_image, dataObject, 'contact_us_image')
}

// create new homepageCMS to DB
const createHomepage = async (req, res, next) => {
    try {
        const newData = {};
        await processRequestBody(req.body, newData, 'post', req) // all data of req.body process

        // create new homepageCMS
        const newHomepageCMS = await homepageCMSModel.create(newData);
        // save homepageCMS
        await newHomepageCMS.save();
        res.status(200).json({
            success: true,
            message: 'All Data of Home Page Saved Successfully',
            CMS: newHomepageCMS
        });
    } catch (error) {
        next(error)
    }



}

// Show homepageCMS List
const showHomepage = async (req, res, next) => {
    try {
        const homepageCMS = await homepageCMSModel.aggregate([
            {
                $lookup: {
                    from: "services",
                    localField: "service_id",
                    foreignField: "_id",
                    as: "serviceDetails"
                }
            }
        ]);

        if (!homepageCMS) {
            throw new ErrorHandler("No Data of Home Page exists", 400);
        }

        res.status(200).json({
            success: true,
            homepageCMS
        })
    } catch (error) {
        next(error)
    }
}

// update homepageCMS
const updateHomepage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = {
            _id: new mongoose.Types.ObjectId(id)
        }

        // Check if the document exists
        const existingHomepageCMS = await homepageCMSModel.findOne(query);
        if (!existingHomepageCMS) {
            throw new ErrorHandler("No Data of Home Page CMS exists for the given id", 400);
        }

        const updatedData = {};
        await processRequestBody(req.body, updatedData, "patch", req)// all data of req.body process

        // Create the update object for home page cms model
        const homepageCMSData = {
            $set: updatedData
        };

        // Update homepageCMS
        const updatedHomepageCMS = await homepageCMSModel.updateOne(query, homepageCMSData);

        res.status(200).json({
            success: true,
            message: 'Data of Home Page CMS updated Successfully',
            CMS: updatedHomepageCMS
        });

    } catch (error) {
        next(error)
    }
}


module.exports = {
    createHomepage,
    showHomepage,
    updateHomepage,
};