// const express = require("express")
// const routes = express.Router();
// const passport = require("passport")
// const { successLogin, failedLogin, logout } = require("../controllers/authController")



// // After successfully login not necessary
// routes.route("/login/success").get(successLogin)

// // Login Failed
// routes.route("/login/failed").get(failedLogin)


// // Logout
// routes.route("/logout").get(logout)

// // Google Login and pop up 
// routes.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }))

// // google callback url
// routes.get("/google/callback", passport.authenticate("google", {
//     successRedirect: process.env.CLIENT_URL,
//     failureRedirect: "/login/failed"
// }))

// // Facebook Login and pop up 
// routes.get("/facebook", passport.authenticate("facebook", { scope: 'email' }))

// // facebook callback url
// routes.get("/facebook/callback", passport.authenticate("facebook", {
//     successRedirect: process.env.CLIENT_URL,
//     failureRedirect: "/login/failed"
// }))

// module.exports = routes;