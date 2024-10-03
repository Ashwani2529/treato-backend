const express = require('express');
const routes = express.Router();
const {uploadImg,replaceImg} = require('../utills/fileUpload')
const {verifySalon ,verifyUser} = require('../middlewares/jwtVerification')
const {createSalons ,getSalons, searchSalonsLocation, getOneSalon,uploadImages,slotsByDay,
    getLocationSuggestions , serviceVenueAndLocationSearch, updateSalons , getSalonById ,
     getSalonLocations, getSalonByLatLngService,updateSalonImg,deleteSalonImg,markImagePrimary} = require('../controllers/salonsController')

routes.route('/new').post(verifyUser,createSalons);
routes.route('/list').get(getSalons);
routes.route('/search').get(searchSalonsLocation);
routes.route('/suggestion').get(getLocationSuggestions)
routes.route('/updateSalon').patch(verifySalon,updateSalons)
//get One Salon by id
routes.route('/getOneSalon').get(verifySalon,getOneSalon)
routes.route('/getSalonById/:id').get(getSalonById)

routes.route('/slotsByDay').get(verifySalon,slotsByDay)
//Combine Search for service and location
routes.route('/combineSearch').get(serviceVenueAndLocationSearch)

//get salon's location
routes.route('/getSalonLocation').get(getSalonLocations)

//get service based on lat and lng value
routes.route('/getSalonByLatLngService').get(getSalonByLatLngService)

//routes for updating salon images
routes.route('/updateSalonImg').put(replaceImg.single('salon_Img'),verifySalon,updateSalonImg);
routes.route('/deleteSalonImg').delete(verifySalon,deleteSalonImg);
routes.route('/markImagePrimary').patch(verifySalon,markImagePrimary);
//upload Images 
routes.route('/uploadImages').post(uploadImg.array("salon_Img", 20),verifySalon,uploadImages);

module.exports = routes;