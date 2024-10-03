const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const careerFormSchema = new Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    phone_number: {
        type: String,
        required: true
    },
    resume: {
        public_url: {
            type: String,
        },
        key: {
            type: String,
        },
    },
    career_id:{
        type: mongoose.Schema.Types.ObjectId, ref: 'careers',
        required:true
    }
},{
    timestamps:true
});

const CareerFormModel = mongoose.model('CareerForm', careerFormSchema);

module.exports = CareerFormModel;
