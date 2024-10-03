const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_TOKEN)

// generate random otp code
const generateRandomOTPCode = () => {
    return randomCode = Math.floor(Math.random() * 9000) + 1000;
}

// send otp using twilio
const sendOTP = (phoneNumber) =>{
    return new Promise((resolve, reject)=>{
        const otp = generateRandomOTPCode();
        client.messages
        .create({
            body: `Your otp is ${otp}.`,
            to: `${phoneNumber}`,
            from: process.env.TWILIO_PHONE_NUMBER
        })
        .then(()=>{
            resolve(otp);
        })
        .catch((error)=>{
            reject(error);
        })
    })
}

//// send otp using twilio
const sendAppointmentOTP = (phoneNumber, otp) => {
    return new Promise((resolve) => {
        client.messages
            .create({
                body: `Your otp is ${otp}.`,
                to: `+91${phoneNumber}`,
                from: process.env.TWILIO_PHONE_NUMBER
            })
            .then(() => {
                resolve(otp);
            })
            .catch((error) => {
                resolve(null); 
            })
    })
}

module.exports = {
    sendOTP,
    generateRandomOTPCode,sendAppointmentOTP
}