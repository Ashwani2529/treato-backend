const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config({ path: "./config/config.env" });
const { DataBaseConnection } = require("./config/DataBaseConnection.js");

/* Passport for google & facebook auth
const cookieSession = require('cookie-session')
const session = require("express-session")
const passport = require("passport")
const passportSetup = require("./passport/passport.js")
const authRoute = require("./routes/auth")*/
// --------------------------------------------------------
const facebookAuthRoute = require('./routes/facebookAuth.js'); // facebook authentication

const homePageCMS = require('./routes/homepageCms.js');
const user = require('./routes/user.js')
const service = require('./routes/service.js')
const blog = require('./routes/blog.js')
const salon = require('./routes/salons.js');
const stylist = require('./routes/stylist.js')
const catchAsyncErrors = require('./middlewares/catchAsyncErrors.js')
const mobileOtp = require('./routes/otpAuth.js');
const appointment = require("./routes/appointment.js");
const feedback = require("./routes/feedback.js");
const lookBook = require("./routes/lookBook.js");
const otpAws = require("./routes/otpWithAWS.js");
const order = require("./routes/order.js");
const holidays = require("./routes/holidays.js");
const sales= require("./routes/sales.js");
const report= require("./routes/reports.js");
const superadmin = require("./routes/superAdmin.js")
const careers = require("./routes/careers.js")
const app = express();

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cors())
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// body modifier middlewares
/*app.use(cors({
    origin: ['http://localhost:3000', 'https://treato.netlify.app'],
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true
}));*/

//Database connection
DataBaseConnection();

// Cookie for passport 
/* app.use(cookieSession(
    {
        name: "session",
        keys: [process.env.COOKIE_KEY],
        maxAge: Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    }
))
app.set("trust proxy", 1);
app.use(
	session({
		secret: "secretcode",
		resave: true,
		saveUninitialized: true,
		name: "sess",
		cookie: {
			sameSite: "none",
			secure: true,
			maxAge: 1000 * 60 * 60 * 24 * 7,
			// httpOnly: true,
		},
	})
);

app.use(passport.initialize()) // Passport initialize
app.use(passport.session()) // Passport session*/

// Route calls 
app.use('/api/v1', facebookAuthRoute);// facebook authentication

// app.use("/api/v1/auth", authRoute); // call passport google authentication
app.use('/api/v1/homePageCMS', homePageCMS);
app.use('/api/v1/service', service);
app.use('/api/v1/blog', blog);
app.use('/api/v1/salon', salon);
app.use('/api/v1/stylist', stylist);
app.use('/api/v1', user);
app.use('/api/v1/user', mobileOtp);
app.use('/api/v1/appointment', appointment);
app.use('/api/v1/feedback', feedback);
app.use('/api/v1/look-book', lookBook);
app.use('/api/v1/otp', otpAws);
app.use("/api/v1/order", order);
app.use("/api/v1/holidays", holidays);
app.use("/api/v1/sales", sales);
app.use("/api/v1/reports", report);
app.use("/api/v1/super",superadmin)
app.use("/api/v1/career",careers)
// Error middleware
app.use(catchAsyncErrors);

app.listen(process.env.PORT, () => {
	console.log(`Treato server is running at ${process.env.PORT}`);
});

app.use("/", (req, res, next) => {
	res.status(200).json("App is working fine..");
});