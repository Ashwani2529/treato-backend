const express = require('express');
const routes = express.Router();
const { sendOTP } = require("../controllers/otpWithAWS")

routes.route('/sent-otp').get(sendOTP);

module.exports = routes;