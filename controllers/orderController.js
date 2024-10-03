const salonsModel = require("../models/salonsModel");
const cron = require("node-cron");
const crypto = require("crypto");
const base64EncodedCredentials = Buffer.from(
  `${process.env.KEY_ID}:${process.env.KEY_SECRET}`
).toString("base64");
const { ErrorHandler } = require("../utills/errorHandler");
const fetch = require("node-fetch");
const { orderModel } = require("../models/orderModel");
const { appointmentModel } = require("../models/appointmentModel");
const { paymentModel } = require("../models/paymentModel");
const Razorpay = require("razorpay");
const fs = require("fs");
const fsx = require("fs").promises;
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

const createOrder = async (req, res, next) => {
  try {
    // Initialize Razorpay instance with API key and secret
    var instance = new Razorpay({
      key_id: process.env.RAZORPAY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    // Extract appointmentId from request body
    let { appointmentId } = req.params;
    if (!appointmentId) {
      throw new ErrorHandler("Appointment ID is required", 400);
    }
    // Retrieve appointment details using the appointmentId
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ErrorHandler("Appointment not found", 404);
    }
    // Determine the payment mode from the appointment
    let paymentMode = appointment.payment_mode.toLowerCase();
    if (paymentMode === "online") {
      // If payment mode is online, create an order with Razorpay
      let order = await instance.orders.create({
        amount: appointment.final_amount * 100,
        currency: "INR",
        notes: {
          key1: "TREATO BOOKING ORDER",
        },
      });
      order.appointmentId = appointmentId;
      // Respond with success message and the created order details
      return res.json({
        success: true,
        order: order,
      });
    } else {
      // If payment mode is on-site, create a new order without using Razorpay
      const newOrder = {
        user_id: appointment.user_id,
        appointment_id: appointmentId,
        salon_id: appointment.salon_id,
        amount: appointment.final_amount,
        Payment_method: "on-site",
        currency: "INR",
        orderTime: Date.now(),
      };
      // Save the new order in the database
      const newOrderDocument = await orderModel.create(newOrder);

      // Respond with success message and the created order details
      return res.json({
        success: true,
        message: "Order Created Successfully",
        order: newOrderDocument,
      });
    }
  } catch (error) {
    const del = await appointmentModel.findByIdAndDelete(order.appointmentId);
    // Handle any errors and respond with an internal server error status
    next(error);
  }
};

const paymentVerify = async (req, res, next) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      order,
    } = req.body;
    if (
      !order ||
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature
    ) {
      throw new ErrorHandler("All fields are required", 400);
    }
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const hmac = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign)
      .digest("hex");
    if (hmac === razorpay_signature) {
      const appointment = await appointmentModel.findById(order.appointmentId);
      if (appointment) {
        // Prepare a new order object to be stored in the database
        const newOrder = {
          user_id: appointment.user_id,
          appointment_id: order.appointmentId,
          salon_id: appointment.salon_id,
          order_id: order.id,
          amount: appointment.final_amount,
          Payment_method: "online",
          amount_paid: order.amount,
          currency: "INR",
          notes: order.notes,
          orderTime: Date.now(),
          status: order.status,
        };

        // Save the new order in the database
        const newOrderDocument = await orderModel.create(newOrder);
        res.json({
          success: true,
          message: "Payment Verified and Order Created Successfully",
          order: newOrderDocument,
        });
      }
    } else {
      const del = await appointmentModel.findByIdAndDelete(order.appointmentId);
      res.json({ success: false, message: "Payment not verified" });
    }
  } catch (error) {
    next(error);
  }
};

// Define a function to get an order by appointment ID
const getOrderByAppointmentId = async (req, res, next) => {
  try {
    // Extract appointmentId from request parameters
    const appointmentId = req.params.appointmentId;
    // Check if appointmentId is missing
    if (!appointmentId) {
      throw new ErrorHandler("Appointment ID is required", 400);
    }

    // Attempt to find an order with the given appointmentId
    const order = await orderModel.findOne({ appointment_id: appointmentId });

    // Check if the order with the specified appointmentId is not found
    if (!order) {
      throw new ErrorHandler("Order not found", 404);
    }

    // Return the order as JSON response
    res.json(order);
  } catch (error) {
    // Handle any unexpected errors and return a 500 Internal Server Error response
    next(error);
  }
};

const paySalon = async (req, res, next) => {
  try {
    //1: Get the current date and time, and calculate 24 hours ago
    const currentDate = new Date();
    const twentyFourHoursAgo = new Date(currentDate - 24 * 60 * 60 * 1000); // Subtracting 24 hours in milliseconds

    //2: Aggregate orders created within the last 24 hours, grouping by salon ID
    // Get all unique salonIDs
    const salonIDs = await orderModel
      .aggregate([
        {
          $match: {
            createdAt: { $gte: twentyFourHoursAgo, $lte: currentDate },
          },
        },
        {
          $group: {
            _id: "$salon_id",
          },
        },
        {
          $project: {
            salonId: "$_id",
          },
        },
      ])
      .exec();
    for (const salonIDObject of salonIDs) {
      const salonID = salonIDObject.salonId;
      const salon = await salonsModel.findById(salonID);

      // Perform online payment
      await processOnlinePayment(salon, salonID);

      // Perform offline payment
      await processOfflinePayment(salon, salonID);
    }
    const processOnlinePayment = async (salon, salonID) => {
      try {
        // Online payment logic

        //1: Retrieve the total amount paid for online orders from the database
        let Totalamount = await orderModel
          .find({ salon_id: salonID })
          .select("amount_paid")
          .then((orders) =>
            orders.reduce((sum, order) => sum + order.amount_paid, 0)
          )
          .catch((error) => {
            return 0;
          });

        //2: Calculate the payout amount (75% of the total amount)
        let amount = Totalamount * 0.75;

        //3: Prepare fund account details for Razorpay
        const fund_account = {
          account_type: "bank_account",
          bank_account: {
            receiverName: salon.salon_name,
            ifsc: salon.bank_details.IFSC_code,
            account_number: salon.bank_details.account_number,
          },
          contact: {
            name: salon.salon_name,
            contact: salon.salons_phone_number,
          },
        };

        //4: Make a payout request to Razorpay API
        const response = await fetch("https://api.razorpay.com/v1/payouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${base64EncodedCredentials}`,
          },
          body: JSON.stringify({
            account_number: "2323230043097169",
            amount: amount * 100,
            currency: "INR",
            mode: "NEFT",
            purpose: "Payout",
            fund_account,
            queue_if_low_balance: true,
            narration: "Treato Daily Payouts Service",
          }),
        });

        //5: Check if the request was successful (status code 2xx)
        if (!response.ok) {
          throw new ErrorHandler(
            `Request failed with status: ${response.status}`,
            500
          );
        }

        //6: Parse the response and create a payment record
        const result = await response.json();
        const payment = await paymentModel.create({
          salon_id: salonID,
          id: result.id,
          fund_account_id: result.fund_account_id,
          fund_account: {
            id: result.fund_account.id,
            contact_id: result.fund_account.contact_id,
            contact: {
              name: result.fund_account.contact.name,
              email: result.fund_account.contact.email,
            },
            account_type: result.fund_account.account_type,
            bank_account: {
              ifsc: result.fund_account.bank_account.ifsc,
              bank_name: result.fund_account.bank_account.bank_name,
              name: result.fund_account.bank_account.name,
              account_number: result.fund_account.bank_account.account_number,
            },
            active: result.fund_account.active,
          },
          amount: result.amount,
          status: result.status,
          mode: result.mode,
          narration: result.narration,
          created_at: result.created_at,
          merchant_id: result.merchant_id,
          orderTime: Date.now(),
        });

        //7: Save the payment record and send the response
        await payment.save();
        res.json(payment);
      } catch (error) {
        console.error("Error processing online payment:", error);
        // Handle errors appropriately
      }
    };

    const processOfflinePayment = async (salon, salonID) => {
      try {
        // Offline payment logic
        let Total_amount = await orderModel
          .find({ salon_id: salonID })
          .select("amount")
          .then((orders) =>
            orders.reduce((sum, order) => sum + order.amount_paid, 0)
          )
          .catch((error) => {
            console.error("Error:", error);
            return 0;
          });

        // Generating an invoice to send it via nodemailer to the salon

        // Function to generate PDF invoice
        let salonName = salon.salon_name;
        let Amount = Total_amount * 0.75;
        const generateInvoicePDF = (salonName, Amount) => {
          const doc = new PDFDocument();
          doc.text("Invoice", { align: "center", underline: true });
          doc.moveDown();
          doc.text(`Date: ${new Date().toLocaleDateString()}`);
          doc.text(`Salon Name: ${salonName}`);
          doc.text(`Total Amount: ${Amount}`);
          // Customize the PDF content as needed
          const pdfPath = "./invoice.pdf";
          doc.pipe(fs.createWriteStream(pdfPath));
          doc.end();

          return pdfPath;
        };

        // Function to send email with attached PDF
        const sendInvoiceEmail = async (recipientEmail, pdfPath) => {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.USER_EMAIL,
              pass: process.env.USER_PASSWORD,
            },
          });

          const mailOptions = {
            from: process.env.USER_EMAIL,
            to: recipientEmail,
            subject: "Daily Invoice",
            text: "Please find the attached invoice.",
            attachments: [
              {
                filename: "invoice.pdf",
                path: pdfPath,
                encoding: "base64",
              },
            ],
          };

          const info = await transporter.sendMail(mailOptions);

          // Delete the PDF file after sending the email
          await fsx.unlink(pdfPath);

          return info;
        };

        // Generate PDF invoice
        const pdfPath = generateInvoicePDF(salonName, Amount);
        let recipientEmail = salon.salon_email;
        // Send email with attached PDF
        sendInvoiceEmail(recipientEmail, pdfPath)
          .then((info) => {
            console.log("Email sent:", info.response);
          })
          .catch((error) => {
            console.error("Error sending email:", error);
          });
      } catch (error) {
        console.error("Error processing offline payment:", error);
        // Handle errors appropriately
      }
    };
  } catch (error) {
    //Handle any errors and send a 500 Internal Server Error response
    next(error);
  }
};

const refundToUser = async (req, res, next) => {
  try {
    //1: Extract paymentId and amount from the request body
    const { paymentId, amount } = req.body;

    //2: Validate that paymentId is provided
    if (!paymentId) {
      throw new Error("Payment ID is required", 400);
    }

    //3: Initiate a refund request to Razorpay API
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${paymentId}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${base64EncodedCredentials}`,
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert amount to paise (multiply by 100)
        }),
      }
    );

    //4: Check if the refund request was successful (status code 2xx)
    if (!response.ok) {
      throw new ErrorHandler(
        `Request failed with status: ${response.status}`,
        500
      );
    }

    //5: Parse the response JSON
    const result = await response.json();

    //6: Send a successful response back to the client
    res.status(200).json({ message: "Refund initiated successfully", result });
  } catch (error) {
    //7: Handle any errors and send a 500 Internal Server Error response
    next(error);
  }
};

const getAllOrdersBySalonID = async (req, res, next) => {
  try {
    //1: Extract salonId from the request parameters
    const salonId = req.params.salonId;

    //2: Validate that salonId is provided
    if (!salonId) {
      throw new ErrorHandler("Salon Id is required", 400);
    }

    //3: Fetch orders from the orderModel based on salonId
    const orders = await orderModel.find({ salonId: salonId });

    //4: Add logic to handle the retrieved orders (you might send them as a response)
    // Note: This example sends the orders as a JSON response
    res.status(200).json({ orders });
  } catch (error) {
    //5: Handle any errors and send a 500 Internal Server Error response
    next(error);
  }
};

const getAllPayoutsBySalonID = async (req, res, next) => {
  try {
    //1: Extract salonId from the request parameters
    const salonId = req.params.salonId;

    //2: Validate that salonId is provided
    if (!salonId) {
      throw new ErrorHandler("Salon Id is required", 400);
    }

    //3: Assuming you have a Payout model and you want to retrieve payouts by salonId
    const payouts = await payoutModel.find({ salonId: salonId });

    //4: Add logic to handle the retrieved payouts (you might send them as a response)
    // Note: This example sends the payouts as a JSON response
    res.status(200).json({ payouts });
  } catch (error) {
    //5: Log the error for debugging purposes
    next(error);
  }
};

const getTransactionsOfaDay = async (req, res, next) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Fetch documents from OrderModel
    const documentsModel1 = await orderModel.find({
      createdAt: { $gte: twentyFourHoursAgo },
    });

    // Fetch documents from PaymentModel
    const documentsModel2 = await paymentModel.find({
      createdAt: { $gte: twentyFourHoursAgo },
    });

    // Note: This example sends the orders & payouts as a JSON response
    res
      .status(200)
      .json({
        success: true,
        Orders: documentsModel1,
        Payouts: documentsModel2,
      });
  } catch (error) {
    //5: Log the error for debugging purposes
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrderByAppointmentId,
  paySalon,
  paymentVerify,
  refundToUser,
  getAllOrdersBySalonID,
  getAllPayoutsBySalonID,
  getTransactionsOfaDay,
};
