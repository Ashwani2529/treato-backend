const { userModel } = require('../models/userModel')
const validator = require("validator")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.SECRETKEY
const { ErrorHandler } = require('../utills/errorHandler');
const { default: mongoose } = require('mongoose');
const axios = require('axios');

// To validate a field based on its value, field name, and maximum, minimum length
const validateField = (field, fieldName, maxLen = null, minLen = null) => {
    return !field && `${fieldName} is Required` ||
        maxLen && field.length > maxLen && `${fieldName} should not be more than ${maxLen} characters` ||
        minLen && field.length < minLen && `${fieldName} should be at least ${minLen} characters` ||
        null
}

// register user
const registerUser = async (req, res, next) => {
    // Define regular expression for phone and password
    const phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?\d{10}$/
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*_])[A-Za-z\d!@#$%^&*_]{8,}$/;
        const { first_name, last_name, email, phone,gender, password, role } = req.body;
    // Define an array of validation checks
    const validations = [
        validateField(first_name, "First Name", 10, 2),
        validateField(last_name, "Last Name", 20, 2),
        validateField(email, "Email"),
        email && validator.isEmail(email) ? null : "Email is not valid",
        validateField(phone, "Phone"),
        phone && phoneRegex.test(phone) ? null : "Phone is not valid", // Use regular expression to check phone validity
        validateField(password, "Password"),
        password && passwordRegex.test(password) // Use regular expression to check password validity
            ? null
            : "Password should contain at least one letter, one number, one special character, and be 8 characters long",
    ];

    // Filter out successful validations (null values represent successful validations)
    const errorMessages = validations.filter(Boolean);
    // Check if there are any error messages
    if (errorMessages.length > 0) {
        return res.status(400).send({ status: false, message: errorMessages[0] });
    }

    try {
        // Check existing user
        const existUser = await userModel.findOne({ $or: [{ email: email }, { phone: phone }] });

        // existing user checking
        if (existUser) {
            throw new ErrorHandler("User already exists", 404)
        }

        // Hash the password using bcrypt
        const encryptedPassword = await bcrypt.hash(password, 10);

        // Create a user object with validated data
        const userData = {
            first_name,
            last_name,
            email,
            phone,
            gender,
            password: encryptedPassword,
            isPass:true
        };

        if (role) userData.role = role;
        // Create and save the user in the database
        const user = await userModel.create(userData);
        await user.save();
        // Generate cookie expiration date
        const options = {
            expire: new Date(
                Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
            ), httpOnly: true,
        }
        // Generate jwt token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })

        res.status(200).cookie('token', token, options).json({
            success: true,
            message: 'User Information Saved Successfully',
            token
        });
    } catch (error) {
        next(error)
    }

}

// User Log in Function
const loginUser = async (req, res, next) => {
    try {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

        const { email, password } = req.body;

        // Define an array of validation checks
        const validations = [
            validateField(email, "Email"),
            email && validator.isEmail(email) ? null : "Email is not valid",
            validateField(password, "Password"),
            password && passwordRegex.test(password) // Use regular expression to check password validity
                ? null
                : "Password should contain at least one letter, one number, one special character, and be 8 characters long",
        ];

        // Filter out successful validations (null values represent successful validations)
        const errorMessages = validations.filter(Boolean);

        // Check if there are any error messages
        if (errorMessages.length > 0) {
            throw new ErrorHandler(errorMessages[0], 401);
        }

        // Find user
        const user = await userModel.findOne({ email }).select('password role')

        // Check user
        if (!user) {
            throw new ErrorHandler("Email is incorrect", 404);
        }

        // Check password
        let validPassword = await bcrypt.compare(password, user?.password);

        // Password is not matching
        if (!validPassword) {
            res.send({ status: false, message: "Password is incorrect" });
        }
        // Generate cookie expiration date
        const options = {
            expire: new Date(
                Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
            ), httpOnly: true,
        }
        // Generate jwt token
        const token = jwt.sign({ id: user?._id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })
        // res.status(200).cookie('token', token, options).send({ status: true, token,role });
        res.status(200).cookie('token', token, options).json({
            success: true,
            message: 'User Logged in Successfully',
            token,
            role:user.role
        });

    } catch (error) {
        next(error)
    }
}

// sent link for forgot password
const forgotPasswordLink = async (req, res, next) => {
    try {
        const email = req.body.email; // get email
        const user = await userModel.findOne({ email }); // find user

        // if user is not exist
        if (!user) {
            const result = {
                acknowledged: false,
                user: "This email is not associated with any account"
            }
            throw new ErrorHandler(result, 400);
        }

        // create secret key for jwt token
        const secret = JWT_SECRET + user.password;
        const payload = {
            email: user?.email,
            id: user?._id
        }
        // create jwt token
        const token = jwt.sign(payload, secret, { expiresIn: '1d' });
        // link which sent to user email
        const link = `https://backend.treato.in/api/v1/login/reset-password?id=${user._id}&token=${token}`;
        // sent mail by using nodemailer
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.USER_EMAIL, // website official gmail
                pass: process.env.USER_PASSWORD // website official gmail's app password
            }
        });

        // sent mail by using nodemailer
        var mailOptions = {
            from: process.env.USER_EMAIL, // website official gmail
            to: user.email, // user email
            subject: 'Reset Password within 24 hours',
            text: link // email's body
        };

        // send mail by using nodemailer
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                throw new ErrorHandler(error, 500);
            } else {
                return res.status(200).send({ status: true, email: 'Email sent: ' + info.response, link })
            }
        });
    } catch (error) {
        // send error message
        next(error)
    }
}

// reset password on link
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.query; // get token from query
        const { password } = req.body; // get new password 
        const user = await userModel.findById(req.query?.id); // find user who reset password

        // if user is not exist
        if (!user) {
            const result = {
                acknowledged: false,
                user: "Invalid User"
            }
            throw new ErrorHandler(result, 400);
        }

        // create secret key for jwt token
        const secret = JWT_SECRET + user?.password;
        const payload = jwt.verify(token, secret);

        // Define regex for password
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

        // Define an array of validation checks
        const validations = [
            validateField(password, "Password"),
            password && passwordRegex.test(password) // Use regular expression to check password validity
                ? null
                : "Password should contain at least one letter, one number, one special character, and be 8 characters long",
        ];
        // Filter out successful validations (null values represent successful validations)
        const errorMessages = validations.filter(Boolean);

        // Check if there are any error messages
        if (errorMessages.length > 0) {
            throw new ErrorHandler(errorMessages[0], 400);
        }

        // password encrypted with bcrypt
        const encryptedPassword = await bcrypt.hash(password, 10);
        // set new password
        user.password = encryptedPassword;
        // update user 
        await user.save();
        res.status(200).send({ status: true, data: user });

    } catch (error) {
        // send error message
        next(error)
    }
}

/*-----------------------------------google and facebook sign in sign in---------------------------------------- */
const generateToken = async (user_id) => {
    // Generate cookie expiration date
    const options = {
        expire: new Date(
            Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ), httpOnly: true,
    }
    // Generate jwt token
    const token = jwt.sign({ id: user_id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })
    return { token, options };
}

// Google Login
const googleLogin = async (req, res, next) => {
    try {
        // Extract access_token from the request body
        const { access_token,role } = req.body;

        // Validate the presence of access_token
        if (!access_token) {
            throw new ErrorHandler("Access token is missing.", 400);
        }

        // Fetch user information from Google using the access_token
        const googleUserInfo = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );

        // Extract relevant user information from the Google response
        const { email, family_name, given_name, picture, phone } = googleUserInfo?.data;

        // Check if email is present in the Google user information
        if (!email) {
            throw new ErrorHandler("Unable to retrieve user information from Google.", 400);
        }

        // Check if the user already exists in the database
        const user = await userModel.findOne({ email });

        if (user) {
            if (picture && !user.avatar) user.avatar = { public_url: picture };
            if (phone && !user.phone) user.phone = phone;
            if (!user?.google) user.google = "connect"
            if (user.google === "disconnect") user.google = "connect"
            await user.save();
            // Generate token for the existing user and send the response
            const { token, options } = await generateToken(user._id);
            return res.status(200).cookie('token', token, options).send({
                status: true,
                user,
                token,
            });
        }

        // Create a new user in the database with the retrieved information
        const newData = {
            email,
            first_name: given_name,
            last_name: family_name,
            avatar: { public_url: picture },
        };

        // Add optional fields to the new user data
        if (role) newData.role = role;
        if (phone) newData.phone = phone;
        newData.google = "connect"

        // Save the new user to the database
        const newUser = await userModel.create(newData);

        // Generate token for the new user and send the response
        const { token, options } = await generateToken(newUser._id);
        return res.status(200).cookie('token', token, options).send({
            status: true,
            newUser,
            token,
        });
    } catch (error) {
        // Handle errors and send 
        next(error)
    }

}


/*-----------------------------------User profile---------------------------------------- */

// get user information
const profile = async (req, res, next) => {
    try {
        const user = req?.user;
        if (!user) {
            throw new ErrorHandler("User does not exist", 409);
        }
        res.status(200).send({ status: true, data: user })
    } catch (error) {
        next(error);
    }
}

// To validate a field based on its value, field name, and maximum, minimum length
const validateProfileField = (field, fieldName, maxLen = null, minLen = null) => {
    return maxLen && field.length > maxLen && `${fieldName} should not be more than ${maxLen} characters` ||
        minLen && field.length < minLen && `${fieldName} should be at least ${minLen} characters` ||
        null
}

// update profile of user
const updateProfile = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new ErrorHandler("User does not exist", 401);
        }

        const { first_name, last_name, email, phone, place, house, landmark, address_type, dob, gender, google, fb, instagram } = req.body;

        const phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/

        // Define an array of validation checks
        const validations = [
            first_name && validateProfileField(first_name, "First Name", 10, 2),
            last_name && validateProfileField(last_name, "Last Name", 20, 2),
            (!email || (email && validator.isEmail(email))) ? null : "Email is not valid",
            (!phone || (phone && phoneRegex.test(phone))) ? null : "Phone is not valid", // Use regular expression to check phone validity
        ];

        // Filter out successful validations (null values represent successful validations)
        const errorMessages = validations.filter(Boolean);


        // Check if there are any error messages
        if (errorMessages.length > 0) {
            console.log(errorMessages[0]);        }

        // user's information updated data object for account settings
        const updateData = {
            social_media_url: {
                ...user?.social_media_url
            },
            location: {
                ...user?.location
            }
        };
        if (first_name) updateData.first_name = first_name;
        if (last_name) updateData.last_name = last_name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;

        // avatar image of user profile
        if (req.file) {
            updateData.avatar = {
                public_url: req.file.location, //  req.file contains image details
                key: req.file.key, // req.file contains image details
            }
        }
        if (gender) updateData.gender = gender;
        if (dob) updateData.dob = dob;
        if (google) updateData.social_media_url.google = google
        if (fb) updateData.social_media_url.fb = fb
        if (instagram) updateData.social_media_url.instagram = instagram

        // manage addresses
        const locationData = {};
        if (house) locationData.house = house
        if (place) locationData.place = place
        if (landmark) locationData.landmark = landmark
        if (address_type) locationData.address_type = address_type;
        updateData.location = locationData;


        // update user data
        const updateUser = await userModel.findOneAndUpdate({ _id: user?._id, email: user?.email }, {
            $set: updateData
        }, { new: true });
        return res.status(200).send({ status: true, message: `${user.first_name}'s data updated successfully!`, data: updateUser })
    } catch (error) {
        next(error)
    }
}

// update password of user profile
const updatePassword = async (req, res, next) => {
    try {
        const { email } = req?.user;// took email from jwt verification middleware
        const { currentPassword, newPassword } = req.body; // get all data from req.body

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/  // password regex

        const user = await userModel.findOne({ email }).select('+password');// get user from jwt verification middleware

        // if provided email user not exist
        if (!user) {
            throw new ErrorHandler('User does not exist!', 401);
        }

        // validation check if user login with social media else only treato manual login 
        let validations;
        if (!user?.password) {
            // Define an array of validation checks
            validations = [
                validateField(newPassword, "New Password"),
                newPassword && passwordRegex.test(newPassword) // Use regular expression to check password validity
                    ? null
                    : "Password should contain at least one letter, one number, one special character, and be 8 characters long",
            ];
        }
        else {
            // Define an array of validation checks
            validations = [
                validateField(currentPassword, "Current Password"),
                validateField(newPassword, "New Password"),
                newPassword && passwordRegex.test(newPassword) // Use regular expression to check password validity
                    ? null
                    : "Password should contain at least one letter, one number, one special character, and be 8 characters long",
            ];
        }


        // Filter out successful validations (null values represent successful validations)
        const errorMessages = validations.filter(Boolean);

        // Check if there are any error messages
        if (errorMessages.length > 0) {
            throw new ErrorHandler(errorMessages[0], 401);
        }

        // if user have password
        if (currentPassword && user?.password) {
            // Check password
            let validPassword = await bcrypt.compare(currentPassword, user?.password);

            // Password is not matching
            if (!validPassword) {
                throw new ErrorHandler("Current password is incorrect", 400);
            }
        }

        // Hash the password using bcrypt
        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        // update user password and return updated data
        const updateUser = await userModel.findOneAndUpdate({ email }, { password: encryptedPassword }, { new: true });

        return res.status(200).send({ status: true, data: updateUser, message: "password changed!" });
    } catch (error) {
        // send error message
        next(error)
    }
};

const setPassword=async(req,res,next)=>{
    try{
    const { email } = req?.user;
    const user = await userModel.findOne({ email });// get user from jwt verification middleware
        // if provided email user not exist
        if (!user) {
            throw new ErrorHandler('User does not exist!', 401);
        }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/  // password regex
    const {password,confirmPassword}=req.body;
    if(password!==confirmPassword){
        throw new ErrorHandler("Password & ConfirmPassword doesn't match",403);
    }
    let validations;
    validations = [
        validateField(password, "New Password"),
        password && passwordRegex.test(password) // Use regular expression to check password validity
            ? null
            : "Password should contain at least one letter, one number, one special character, and be 8 characters long",
    ];
     // Filter out successful validations (null values represent successful validations)
     const errorMessages = validations.filter(Boolean);

     // Check if there are any error messages
     if (errorMessages.length > 0) {
         throw new ErrorHandler(errorMessages[0], 401);
     }
       // Hash the password using bcrypt
       const encryptedPassword = await bcrypt.hash(password, 10);
       const updateUser = await userModel.findOneAndUpdate({ email }, { password: encryptedPassword,isPass:true },{ new: true });
       return res.status(200).send({ status: true, data: updateUser, message: "password set!" });
    }
    catch(error){
        next(error);
    }};

module.exports = {
    loginUser,
    registerUser,
    forgotPasswordLink,
    resetPassword,
    profile,
    updateProfile,
    updatePassword,
    googleLogin,setPassword
}