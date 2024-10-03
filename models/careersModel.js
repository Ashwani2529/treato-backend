const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CareersSchema = new Schema({
    job_title: {
        type: String,
        required: true
    },
    job_location: {
        type: String,
        required: true
    },
    role_experience: {
        type: String,
        required: true
    },
    job_worffrom: {
        type: String,
        required: true
    },
    descriptions: [{
        title: String,
        description: String
    }]
},{
    timestamps:true
});

const CareersModel = mongoose.model('careers', CareersSchema);

module.exports = CareersModel;
