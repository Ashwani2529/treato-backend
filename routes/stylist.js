const express = require('express');
const routes = express.Router();
const {uploadImg} = require('../utills/fileUpload')
const { createStylist , getOneStylist,teamSchedule ,removeStylist,
    deleteStylist , listAllStylist ,updateStylist,teamMembers,
    editEmployeeSchedule,deleteShift,addLeave,editShift,getShiftsByDay } = require('../controllers/stylistController')
const { verifySalon } = require("../middlewares/jwtVerification");

//Create Stylist
routes.route('/new').post(uploadImg.single("stylist_Img") ,verifySalon, createStylist);

//get one stylist
routes.route('/getOneStylist/:id').get(getOneStylist)

//list stylist
routes.route('/list').get(verifySalon ,listAllStylist)

//remove stylist
routes.route('/removeStylist/:stylistId').patch(verifySalon ,removeStylist)

//delete Stylist
routes.route('/deleteStylist/:id').delete(verifySalon , deleteStylist)

//Update Stylst
routes.route('/updateStylist/:id').patch(uploadImg.single("stylist_Img"),verifySalon ,updateStylist)

//get team members info
routes.route('/teamMembers').get(verifySalon,teamMembers)

//get team schedule
routes.route('/teamSchedule').get(verifySalon,teamSchedule)

//add leave
routes.route('/addLeave').patch(verifySalon,addLeave)
//edit employee schedule
routes.route('/editEmployeeSchedule').patch(verifySalon,editEmployeeSchedule)
//delete shift
routes.route('/deleteShift').patch(verifySalon,deleteShift)
//edit shift
routes.route('/editShift').patch(verifySalon,editShift)
routes.route('/getShiftsByDay').get(verifySalon,getShiftsByDay)
module.exports = routes;