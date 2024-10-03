
const mongoose = require("mongoose")

const appointmentSchema = mongoose.Schema({
    salons_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'salons'
    },
    service_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services'
    }],
    selectedStylistId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'stylists'
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    coupon_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'coupons'
    },
    initial_amount: {
        type: Number
    },
    final_amount: {
        type: Number
    },
    bookingTime:{
        type: String,
        default:new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    },
    start_date: {
        type: String,
        default: new Date().toISOString().slice(0, 10)
    },
    end_date: {
        type: String
    },
    totalTimeTaken:{
        type:String
    },
    time: {
        type: String
    },
    status: {
        type: String
    },
    payment_mode: {
        type: String
    },
    reason: {
        type: String
    },
    noPreference :{
        type : Boolean,
    },
    dateforService : {
        type : String
    },
    userData :{
        type : Object
    },
    otp:{
        type:Number
    },
    additionalComments:{
        type:String
    }
},
{
    timestamps: true
}
);

const appointmentModel = mongoose.model("appointment", appointmentSchema)

module.exports = {
    appointmentModel
}