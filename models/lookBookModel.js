const mongoose = require("mongoose");

const lookBookSchema = mongoose.Schema({
    show: {
        type: Boolean,
        default: true
    },
    photo: {
        public_url: {
            type: String,
            require: true
        },
        key: {
            type: String,
        }
    },
    name: {
        type: String,
        require: true
    },
    description: {
        type: String,
        require: true
    },
    service_subcategory_id: {
        type: mongoose.Schema.Types.ObjectId,
        require: true
    },
    price: {
        type: Number
    },
    rating: {
        type: Number
    },
    service_categories: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services',
        require: true
    },
    stylists: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'stylists',
    }],
    salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'salons',
        require: true
    },
    locationText: {
        type: String, // Store the original location text
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'], // Ensures the type is 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
        },
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
    },
});
lookBookSchema.index({ location: '2dsphere' });

const lookBookModel = mongoose.model("lookbook", lookBookSchema);


module.exports = {
    lookBookModel,
};
