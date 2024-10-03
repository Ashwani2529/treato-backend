const express = require('express');
const routes = express.Router();
const { otpSignIn, sendPhoneOtp } = require('../controllers/otpAuthController');

// sign in with otp
routes.route("/otpsignin").post(otpSignIn);
// sign in with otp
routes.route("/otpsignup").post(sendPhoneOtp);
// send otp to phone number 
routes.route("/sendotp").post(sendPhoneOtp);

module.exports = routes;