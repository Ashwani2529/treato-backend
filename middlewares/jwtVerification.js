const jwt = require('jsonwebtoken')
const { userModel } = require('../models/userModel');
const { salonsModel } = require('../models/salonsModel');
const { ErrorHandler } = require('../errorHandlers/errorHandler');
const JWT_SECRET = process.env.SECRETKEY

// verify user by middleware function
const verifyUser = async (req, res, next) => {
    const token = req.headers.token;

    if (!token) {
        return res.status(401).send({ status: false, error: 'unauthorized access' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userModel.findOne({ _id: decoded?.id });
        req.user = user;
        next();
    } catch {
        return res.status(401).send({ status: false, message: "Invalid JWT Token", error: 'forbidden access' });
    }
}

const verifySalon = async (req, res, next) => {
    const token = req.headers.token;

    if (!token) {
        return res.status(401).send({ status: false, error: 'unauthorized access' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const salon = await salonsModel.findOne({user: decoded?.id });
        req.salon= salon;
        next();
    } catch {
        return res.status(401).send({ status: false, message: "Invalid JWT Token", error: 'forbidden access' });
    }
}

const verifyAny= async (req, res, next) => {
    const token = req.headers.token;

    if (!token) {
       throw new ErrorHandler()
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userModel.findOne({ _id: decoded?.id });
        const salon = await salonsModel.findOne({user: decoded?.id });
        req.user = user;
        req.salon= salon;
        next();
    } catch {
        return res.status(401).send({ status: false, message: "Invalid JWT Token", error: 'forbidden access' });
    }
}

const verifySuperadmin = async (req, res, next) => {
    try {
        const token = req.headers.token;
        if (!token) {
            throw new ErrorHandler("token not provide",400)
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded || !decoded.id) {
            throw new ErrorHandler("invalid token",400)
        }

        const user = await userModel.findById(decoded?.id).select("+password");
        if (!user) {
            throw new ErrorHandler("user not found",400)
        }

        if (user.role !== "super") {
            throw new ErrorHandler("access forbidden",400)
        }
        next();
    } catch (error) {
     next(error)
    }
};

module.exports = {
    verifyUser,verifySalon,verifyAny,verifySuperadmin
}
