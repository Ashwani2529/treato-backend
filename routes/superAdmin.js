const express = require('express');
const { superadminstatistics, 
    allsalonapproval, 
    allbillinghistory, 
    loginSuperAdmin,
    showallactivesalons,
    handlesalonactivetrue,
    showSalonDetails,
    showsalonbooking,
    showsalonservices} = require('../controllers/superAdminController');
const { verifySuperadmin } = require('../middlewares/jwtVerification');
const routes = express.Router();



//post api for statistics
routes.route("/statistics").post(verifySuperadmin,superadminstatistics);
//get api for all salon for approval
routes.route("/allpartnerapproval").get(verifySuperadmin,allsalonapproval);
//get api for billing history
routes.route("/allbillinghistory").get(verifySuperadmin,allbillinghistory);
//post api for super admin login
routes.route("/adminauth").post(loginSuperAdmin)
//get api for all active salons
routes.route("/allactivesalons").get(verifySuperadmin,showallactivesalons);
//patch api for particular salon for is approved
routes.route("/salonapproveaction").patch(verifySuperadmin,handlesalonactivetrue)
//get api for single salon basic detail
routes.route("/singlesalondetail/:id").get(verifySuperadmin,showSalonDetails)
//get api for single salon all booking
routes.route("/singlesalonbookings/:id").get(verifySuperadmin,showsalonbooking)
//get api for single salon other services
routes.route("/singlesalonservices/:id").get(verifySuperadmin,showsalonservices)













module.exports = routes;