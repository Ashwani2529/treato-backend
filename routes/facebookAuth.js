const express = require('express');
const routes = express.Router();
const { facebookLogin } = require("../controllers/facebookAuthController")

// Initiates the Facebook Login flow
routes.route('/auth/facebook').post(facebookLogin);


module.exports = routes;

