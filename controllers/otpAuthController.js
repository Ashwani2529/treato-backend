const { userModel } = require('../models/userModel')
const { ErrorHandler } = require('../utills/errorHandler')
const { sendOTP } = require("../utills/generateOTP")
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.SECRETKEY

// otp sent to mobile number
const sendPhoneOtp = async (req, res, next) => {
    try {
        const { phoneNumber } = req.body;
        // checking the route path
        const path = req.route.path.slice(1);

        // check user if route path otpsignup
        if (path === "otpsignup") {
            const user = await userModel.findOne({ phone: phoneNumber });
            if (user) {
                return res.status(400).send({ status: false, message: 'User already exists!' });
            }
        }
        // sent otp to number
        const otp = await sendOTP(phoneNumber);

        if (otp) {
            return res.status(200).send({
                status: true,
                message: "OTP sent!",
                otp
            })
        }
        else {
            throw new ErrorHandler('Please enter a valid phone number!', 400);
        }
    } catch (error) {
        next(error)
    }
}

// otp sent to mobile and sign in
const otpSignIn = async (req, res, next) => {
    try {
        const { phoneNumber } = req.body;

        const user = await userModel.findOne({ phone: phoneNumber })

        if (!user) {
            throw new ErrorHandler("Mobile number does not exist", 500);
        }
        
        const otp = await sendOTP(phoneNumber);

        if (otp) {
            const token = jwt.sign({ email: user?.email }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
            res.status(200).send({
                status: true,
                token,
                data: user,
                message: "User sign in successfully!",
                otp
            })
        }
        else {
            res.status(400).send({ status: false, message: 'Please enter valid phone number!' });
        }

    } catch (error) {
        next(error);
    }
}


module.exports = {
    otpSignIn,
    sendPhoneOtp
}