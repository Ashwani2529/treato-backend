const { SNSClient, ListTopicsCommand, PublishCommand } = require("@aws-sdk/client-sns");
const { generateRandomOTPCode } = require('../utills/generateOTP')
const { config } = require('dotenv');

config({
    path: "./config/config.env"
});

const sns = new SNSClient({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_CLIENT,
        secretAccessKey: process.env.AWS_SECRET_KEY_CLIENT,

    },
    region: "ap-south-1",
})
const sendOTP = async (req, res) => {
    try {
    const otp = generateRandomOTPCode();
    const { phoneNumber } = req.query;
    const params = {
        Message: `Your OTP code is ${otp}`,
        PhoneNumber: `+${phoneNumber}`,
        MessageAttributes: {
            'AWS.SNS.SMS.SenderID': {
                'DataType': 'String',
                'StringValue': 'Treato'
            }
        }
    }
    const command = new PublishCommand(params);
    const message = await sns.send(command)
    res.status(200).send({ message });
    } catch (error) {
        res.send({ error })
    }
}

module.exports = {
    sendOTP
}