const { feedbackModel } = require("../models/feedbackModel");
const { appointmentModel } = require("../models/appointmentModel");
const { ErrorHandler } = require("../utills/errorHandler");

// field validation
const validation = (field, fieldName) => {
    if (!field) {
        throw new ErrorHandler(`${fieldName} field is required!`,400)
    }
}

// give review for completed appointment
const createReview = async (req, res) => {
    try {
        const { id } = req.query;
        // find out appointment by id
        const appointment = await appointmentModel.findById(id);
        if (!appointment) {
            throw new ErrorHandler("Appointment does not exist!",404)
        }

        // create new feedback
        const { serviceRate, stylistRate, review, description } = req.body;
        validation(serviceRate, "service rate");
        validation(stylistRate, "stylist rate");
        validation(review, "review");
        const newData = {
            service_rate: serviceRate,
            stylist_rate: stylistRate,
            review,
            salons_id: appointment?._id,
            user_id: appointment?.user_id
        };
        description && (newData.description = description);

        // create new review
        const newReview = await feedbackModel.create(newData);
        res.status(200).send({ status: true, data: newReview, message: "Thanks for your feedback." });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    createReview
}