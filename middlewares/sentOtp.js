const { sendOTP } = require("../utills/generateOTP");


// otp sent to mobile number
const sentOtpMiddleware = async (req, res) => {
    try {
        
        const { phoneNumber } = req.body;
        const otp = await sendOTP(phoneNumber);
        if (otp) {
            return res.status(200).send({
                status: true,
                message: "OTP sent!",
                otp
            })
        }
        else {
            res.status(400).send({ status: false, message: 'Please enter a valid phone number!' });
        }
    } catch (error) {
        res.status(500).send({ error: error.message })
    }
}