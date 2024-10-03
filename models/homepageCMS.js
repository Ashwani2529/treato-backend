const mongoose = require('mongoose')

const homepageCMSSchema = new mongoose.Schema({
    main_heading: {
        type: String,
        maxlength: 43,
        require: true
    },
    service_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services'
    }],
    downloadApp_section: {
        downloadApp_heading: {
            type: String,
            maxlength: 30,
        },
        downloadApp_subheading: {
            type: String,
            maxlength: 96,
        }
    },
    partner_section: {
        partner_heading: {
            type: String,
            maxlength: 16
        },
        partner_subheading: {
            type: String,
            maxlength: 128
        }
    },
    testimonial: {
        type: Boolean
    },
    contact_us_image: {
        public_url : {
            type:String,
        },
        key: {
            type:String,
        }
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
    }
})

const homepageCMSModel = mongoose.model('homepageCMS', homepageCMSSchema)

module.exports = {
    homepageCMSModel
}