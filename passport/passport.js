// const passport = require("passport")
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const FacebookStrategy = require("passport-facebook").Strategy
// const { userModel } = require("../models/userModel")

// // For Google log in strategy
// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: process.env.GOOGLE_CALL_BACK_URL
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//         const user = {
//             first_name: profile.name.givenName,
//             last_name: profile.name.familyName,
//             email: profile.emails[0].value
//         }

//         // User already exists, return the existing user
//         let existingUser = await userModel.findOne({ email: user.email });
//         if (existingUser) {
//             return done(null, existingUser)
//         }

//         // create new user
//         let newUser = await userModel.create(user);
//         return done(null, newUser)
//     } catch (error) {
//         return done(error)
//     }
// }))

// // For facebook login strategy
// passport.use(new FacebookStrategy({
//     clientID: process.env.FACEBOOK_APP_ID,
//     clientSecret: process.env.FACEBOOK_APP_SECRET,
//     callbackURL: process.env.FACEBOOK_CALL_BACK_URL,
//     profileFields: ['id','displayName', 'name', 'gender', 'picture.type(large)','email']
// },
//     async (accessToken, refreshToken, profile, done) => {
//         try {
//             const user = {
//                 first_name: profile.name.givenName,
//                 last_name: profile.name.familyName,
//                 email: profile.emails[0].value
//             }

//             // User already exists, return the existing user
//             let existingUser = await userModel.findOne({ email: user.email });
//             if (existingUser) {
//                 return done(null, existingUser)
//             }

//             // create new user
//             let newUser = await userModel.create(user);
//             return done(null, user)
//         } catch (error) {
//             return done(error)
//         }
       
//     }
// ));

// // Serialize user to store in session
// passport.serializeUser((user, done) => {
//     done(null, user)
// })

// // Deserialize user from session
// passport.deserializeUser((user, done) => {
//     done(null, user)
// })