const express = require('express');
const routes = express.Router();
const { registerUser, loginUser, forgotPasswordLink, resetPassword, profile, updateProfile, updatePassword, googleLogin, setPassword } = require('../controllers/userController')
const { verifyUser } = require('../middlewares/jwtVerification')
const { uploadImg} = require('../utills/fileUpload')

// Register a user
routes.route('/registration').post(registerUser)
// login a user
routes.route('/login').post(loginUser)
// forgot password
routes.route('/login/forgot-password-link').post(forgotPasswordLink)
// reset password
routes.route('/login/reset-password').patch(resetPassword)

/*------------------------------------ Google Login Sign up-----------------------------------*/
routes.route('/google').post(googleLogin);

/*------------------------------------ User profile -----------------------------------*/

// user profile information
routes.route('/profile').get(verifyUser, profile)
// user update profile information
routes.route('/profile/update').patch(verifyUser, uploadImg.single("avatar"), updateProfile)
// user password update 
routes.route('/profile/update_password').patch(verifyUser, updatePassword)
//route to set password
routes.route('/profile/setPassword').patch(verifyUser,setPassword)
module.exports = routes;
