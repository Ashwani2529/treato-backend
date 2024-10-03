// const jwt = require("jsonwebtoken");
// const { userModel } = require("../models/userModel");
// const JWT_SECRET = process.env.SECRETKEY


// // Successfully Login not necessary
// const successLogin = async (req, res) => {
//     console.log(req);
//     console.log(req.user);
//     if (req.user) {
//         res.status(200).json({
//             success: true,
//             message: "Successfully Log In",
//             user: req.user,
//         })
//     }
//     else {
//         res.status(401).json({
//             success: false,
//         })
//     }
// }

// // Failed Login
// const failedLogin = (req, res) => {
//     res.status(401).send({
//         success: false,
//         message: "Failed"
//     })
// }

// // Logout 
// const logout = (req, res) => {
//     req.logOut();
//     res.redirect(process.env.CLIENT_URL)
// }

// module.exports = {
//     successLogin,
//     failedLogin,
//     logout
// }