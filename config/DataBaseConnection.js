const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: "./config/config.env" });
mongoose.set('strictQuery', false);

 const DataBaseConnection = () => {
    mongoose.connect(process.env.DATABASE, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    }).then((data) => {
        console.log(`mongoDB connect with host:${data.connection.host}`);
    });
};

module.exports = {
    DataBaseConnection
}