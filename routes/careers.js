const express = require('express');
const { uploadPDF } = require('../utills/fileUpload');
const { jobformaaplication , careersjobdetail,uploadPDFfile,
    allopeningjob} = require('../controllers/careersControllers');
const routes = express.Router();


//post api job form 
routes.route("/jobformapply").post(uploadPDF.single('resume',20),jobformaaplication)
//post api for opening jon form 
routes.route("/createjobopening").post(careersjobdetail)
//get api for all jon opening
routes.route("/alljobopening").get(allopeningjob)
//post api for upload pdf
routes.route("/uploadpdf").post(uploadPDF.single('resume',20),uploadPDFfile)


module.exports = routes;