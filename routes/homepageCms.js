const express = require('express');
const routes = express.Router();
const {uploadImg} = require('../utills/fileUpload')
const { createHomepage, showHomepage, updateHomepage } = require('../controllers/homePageCMSController');


routes.route('/add').post(uploadImg.single("contact_us_image"), createHomepage); // create a new homepageCMS
routes.route('/show').get(showHomepage); // view every homepageCMS
routes.route('/edit/:id').patch(uploadImg.single("contact_us_image"), updateHomepage); // update specific homepageCMS

module.exports = routes;