const mongoose = require("mongoose");

const feedbackSchema = mongoose.Schema({
    service_rate: {
        type: mongoose.Types.Decimal128,
        required: true
    },
    stylist_rate: {
        type: mongoose.Types.Decimal128,
        required: true
    },
    review: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    created: {
        type: Date,
        default: Date.now,
    },
    modified: {
        type: Date,
        default: Date.now,
    },
    deleted: {
        type: Date,
        default: Date.now,
    }

})

const feedbackModel = mongoose.model("feedback", feedbackSchema);

module.exports = {
    feedbackModel
}