const mongoose = require("mongoose")
const contactUsSchema = mongoose.Schema({
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
        required: true
    },
    message: {
        type: String,
        required: true
    },
    phonenumber:{
        type:Number,
    },
    isAcceptPrivacy:{
        type:Boolean,
        default:false
    }
});
const contactUsModel= mongoose.model("contactus", contactUsSchema);
module.exports ={contactUsModel};