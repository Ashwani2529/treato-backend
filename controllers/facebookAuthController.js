const axios = require('axios');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.SECRETKEY;
const { userModel } = require('../models/userModel');
const { ErrorHandler } = require('../utills/errorHandler')

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_APP_TOKEN = process.env.FACEBOOK_APP_TOKEN;


const buildUrlFbInspectToken = (token) => `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${FACEBOOK_APP_TOKEN}`

const fields = 'id,name,first_name,last_name,email,picture.type(large)';
const buildUrlFbMe = (FB_ID_PERSON, token) => `https://graph.facebook.com/${FB_ID_PERSON}?fields=${fields}&access_token=${token}`

const getDataFromFbUsingAToken = async (data) => {
    try {
        let code = data["token"]; // this is the token from facebook that the user already authorized the app, logged in.
        let redirectUri = data["redirectUri"];
        let encodeRedirectURI = encodeURIComponent(redirectUri);

        //Get another token
        let url = `https://graph.facebook.com/v13.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeRedirectURI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`
        let result = await axios.get(url);
        let token = result?.data["access_token"];
        //Get the user id from the user.
        let dataFbToken = await axios.get(buildUrlFbInspectToken(token));
        let userFbId = dataFbToken?.data?.data?.user_id;
        // get the whole data. // Put the data you want in the URL.
        let userData = await axios.get(buildUrlFbMe(userFbId, token));
        return userData?.data;
    } catch (error) {
        throw new ErrorHandler("Facebook login unsuccessful", 400);
    }
}

const facebookLogin = async (req, res, next) => {
    try {
        let data = req.body;
        let response = await getDataFromFbUsingAToken(data);
        let user = await userModel.findOne({ email: response?.email })
        if (!user) {
            const userData = {
                first_name: response?.first_name,
                last_name: response?.last_name,
                email: response?.email,
                avatar: {
                    public_url: response?.picture?.data?.url
                },
                facebook: "connected"
            }
            user = await userModel.create(userData);
        }
        else {
            user.avatar = {
                public_url: response?.picture?.data?.url
            }
            await user.save();
        }

        // Generate jwt token
        const token = jwt.sign({ id: user?._id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })

        res.status(200).send({ status: true, data: user, token });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    facebookLogin
}