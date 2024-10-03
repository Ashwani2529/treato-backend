
const mongoose = require('mongoose')
const { reviewSchema } = require('../models/reviewSchema')

const salonsSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId, ref: 'user',
        required: true
    },
    services: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'service'
    }],
    stylists: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'stylists'
    }],
    services_provided:[
        {
            type:String
        }
    ],
    salon_name: {
        type: String,
        required: true
    },
    salons_description: {
        type: String
    },
    website:{
        type : String
    },
    salons_address: {
        type: String,
    },
    location_details:{
        location:{type:String},
        building_number:{type:String},
        landmark:{type:String},
        city:{type:String},
        postal_code:{type:Number},
    },
    salon_Img: [{ //multiple Images
        public_url: {
            type: String,
        },
        key: {
            type: String,
        },
        isPrimary:{
            type:Boolean,
            default:false
        }
    }],
    locationText: {
        type: String, // Store the original location text
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
    salon_email:{
        type : String,
        required : true,
        unique : true
    },
    isClosed:{
        status:{
            type : Boolean,
            default : false
        },
        date:{
            type : String
        }
    },
    salons_phone_number: {
        type: Number
    },
    bank_details: {
        account_number: {
            type: String,
            //required : true
        },
        bank_name: {
            type: String,
            //required : true
        },
        account_holder_name: {
            type: String,
            // required : true
        },
        IFSC_code: {
            type: String,
            // required:true
        }
    },
    working_hours: [{
        day: {
            type: String
        },
        opening_time: {
            type: String
        },
        closing_time: {
            type: String
        }
    }],
    salon_offers: [{
        title: {
            type: String
        },
        description: {
            type: String
        },
        discount_percentage:{
            type : Number
        },
        amount_for_discount:{
            type: Number
        },
        for_first_order : {
            type : Boolean,
            default : false
        },
        discount_type:{
            type : String
        }
    }],
    salons_logo: {
        type: String
    },
    banner: {
        type: String
    },
    social_media_url: {
        facebook: {
            type: String
        },
        instagram: {
            type: String
        },
        twitter: {
            type: String
        }
    },
    reviews: [{
        // user: {
        //     type: mongoose.Schema.Types.ObjectId, ref: 'user',
        //     required: true
        // },
        id :{
            type : String
        },
        name: {
            type : String
        },
        time : {
            type : String
        },
        comment: {
            type: String,
            // required: true,
        },
        rating: {
            type: Number,
            //required: true,
        },
        created_at: {
            type: Date,
            default: Date.now(),
        },
    }],
    salots_gap : {
        type : String,
        default : "30"
    },
    rating: {
        type: Number,
        default: 0
    },
    venue_type: {
        type: String,
        enum : ["everyone","female","male"]
    },
    created: {
        type: Date,
        default: Date.now,
    },
    modified: {
        type: Date,
        default: null,
    },
    deleted: {
        type: Date,
        default: null,
    },
    isApproved:{
        type:Boolean,
        default:false
    }
}, {
    strictPopulate: false
});

salonsSchema.index({ location: '2dsphere' });

const salonsModel = mongoose.model('salons', salonsSchema)

module.exports = {
    salonsModel
}

