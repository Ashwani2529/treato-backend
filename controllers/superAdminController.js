const { appointmentModel } = require("../models/appointmentModel");
const { orderModel } = require("../models/orderModel");
const { salonsModel } = require("../models/salonsModel");
const { userModel } = require("../models/userModel");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose")
const {ErrorHandler} = require("../errorHandlers/errorHandler");
const { calculatePercentage } = require("../utills/percentage");
const JWT_SECRET = process.env.SECRETKEY

const superadminstatistics = async (req, res,next) => {
    try {
        const { days } = req.body; // here  get days
        if (!days) {
            throw new ErrorHandler("days required",400)//if days not found throwing error
        }

        //here count documents with in last days 
        const usersCount = await userModel.countDocuments({
            created: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        });

        // total user count
        const totalUsersCount = await userModel.countDocuments();

         // here pass two data calulated user count and all total count to find percentage
        const usersPercentage = calculatePercentage(usersCount, totalUsersCount);


        //here same calculate document by last days
        const appointmentCount = await appointmentModel.countDocuments({
            updatedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        });

        //same here passsing counted documents and total user count
        const appointmentPercentage = calculatePercentage(appointmentCount, totalUsersCount);

        //calculating documentcount by last days by checking orderTime ,then group with totalSales and use sum opreter to sum all document amount and also average 
        const salesData = await orderModel.aggregate([
            { $match: { orderTime: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: null, totalSales: { $sum: '$amount' }, averageSales: { $avg: '$amount' } } }
        ]);
        const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;//here checking if length is empty then set the 0
        const averageSales = salesData.length > 0 ? salesData[0].averageSales : 0;//here checking if length is empty then set the 0
        const percentageChange = salesData.length > 0 ? salesData[0].percentageChange : 0;//here checking if length is empty then set the 0
        const averageSalesPercentage = calculatePercentage(averageSales, totalSales);//here pass 
        res.status(200).json({
            usersCount,
            usersPercentage,
            appointmentCount,
            appointmentPercentage,
            totalSales,
            averageSales,
            averageSalesPercentage,
            percentageChange
        });
    } catch (error) {
       next(error)
    }
};


const allsalonapproval = async (req, res,next) => {
    try {
        //here find all saloon data who's document isApproved field value false 
        const pendingSalons = await salonsModel.aggregate([
            { $match: { isApproved: false } }
        ]);
        //here checking of pendingSalons data length is 0 then here return message
        if (pendingSalons.length === 0) {
            return res.status(200).json({ message: "No pending salon approvals found" });
        }
        //else here passing all pendingSalons 
        res.status(200).json({ pendingSalons });
    } catch (error) {
        //handeling errors
        next(error)
    }
};

const allbillinghistory = async (req, res,next) => {
    try {
        const orders = await orderModel.aggregate([
            {
                $match: {}                   // here not filter so we fetch all document
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',     //2stage for lookup there user_id object id and find document from users model for further require value
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $lookup: {
                    from: 'appointments', 
                    localField: 'appointment_id', //3rd stage is for lookup appointment_id object id and find document from appointment model
                    foreignField: '_id',
                    as: 'appointment'
                }
            },
            {
                $lookup: {
                    from: 'salons', 
                    localField: 'appointment.salons_id', //4th stage is for appointment document have salon_id object id so i also lookup salons document with help of from appointment document salons_id  for further requirement value
                    foreignField: '_id',
                    as: 'salon'
                }
            },
            {
                //5th stage for project all documents we got and also front end require this type of structure so  abstract value from there particular field 
                $project: {
                    customer_name: {
                        $concat: [
                            { $arrayElemAt: ['$user.first_name', 0] }, 
                            ' ',                                         // here concat first name or last name from user pipeline
                            { $arrayElemAt: ['$user.last_name', 0] } 
                        ]
                    },
                    salon_name: { $arrayElemAt: ['$salon.salon_name', 0] }, // here add salon name from salon pipeline document
                    invoice: '$_id', 
                    date: '$createdAt', // here add date from current orderModel createdAt field
                    location: {$arrayElemAt :['$salon.locationText',0]}, // here add salon location text from salon pipeline document
                    amount: '$amount' // here add amount of that particular  , this value from from current orderModel amount
                }
            }
        ]);
        res.status(200).json({ success: true, data: orders }); // here pass status and data
    } catch (error) {
        next(error)  
    }
};

const loginSuperAdmin = async (req, res,next) => {
    const { email, password } = req.body; // here get email and password from body front end
    try {
        //here checking of front end not pass any credential then  return with error message
        if (!email || !password) { 
            throw new ErrorHandler("email and password is required",400)
        }
        //here find document based on email
        const user = await userModel.findOne({ email }).select("+password");
        if (!user) {
            throw new ErrorHandler("user not found",400)
        }

        //here comparing coming password with saved user password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ErrorHandler("invalid credential",400)
        }

        //if is not valid here return a error message
        if (!isPasswordValid) {
            throw new ErrorHandler("invalid credential",400)
        }

       // it is main if all credential is fine but also check here that role is admin then user use use super admin dashboard otherwise pass here error message
        if (user?.role !== "super") {
            throw new ErrorHandler("Access Forbidden",400)
        }

         //if all credential and role is admin then , here generate token 
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
        //here sending  a token to a front end
        res.status(200).json({token});

    } catch (error) {
       next(error)
    }
};

const showallactivesalons = async (req, res,next) => {
    try {
        //here find all document who's salon is isApproved true
        const activesalons = await salonsModel.aggregate([
            {
                $match: { isApproved: true } 
            },
            {
                $lookup: {
                    from: "appointments",
                    localField: "_id",                    //2stage find documents from appointments model with salons_id
                    foreignField: "salons_id",
                    as: "appointments"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "appointments.user_id",    //3stage find documents from user model with appointment user_id
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $project: {
                    _id:"$_id",
                    salon_name: "$salon_name",
                    owner_name: { $concat: [
                        { $arrayElemAt: ['$user.first_name', 0] }, 
                        ' ',                                                //4stage project all the required field for front end and add's abstracting values form documents
                        { $arrayElemAt: ['$user.last_name', 0] } 
                    ]},
                    address: "$locationText",
                    date_join: "$created",
                    rating: "$rating",
                    net_sales: {
                        $sum: "$appointments.final_amount"
                    },
                    salon_image:"$salon_Img"
                }
            }
        ]);

        res.status(200).json({ success: true, data: activesalons }); // here pass active salons 
    } catch (error) {
        next(error)
    }
}

//this function for to update salon approved true
const handlesalonactivetrue = async (req, res,next) => {
    try {
        const { salon_id } = req.body; 
        if (!salon_id) {
            throw new ErrorHandler("salon id is required",400)
        }

        const updatedSalon = await salonsModel.findOneAndUpdate(
            { _id: salon_id },
            { isApproved: true },
            { new: true } 
        );

        if (!updatedSalon) {
            throw new ErrorHandler("salon not found",400)
        }

        res.status(200).json({ success: true, message:"approved successfully" });
    } catch (error) {
        next(error)
    }
};

const showSalonDetails = async (req, res,next) => {
    try {
      const { id } = req.params;
  
      const salon = await salonsModel.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(id) } 
        },
        {
            $project:{
                salon_name:"$salon_name",
                salon_rating:"$rating",
                salon_address:"$locationText",
                salon_image:"$salon_Img"
            }
        }
      ]);
  
      res.status(200).json({ success: true, data: salon });
    } catch (error) {
      next(error)
    }
};

const showsalonbooking = async(req,res,next)=>{
    try{
        const { id } = req.params;
  
        const orders = await appointmentModel.aggregate([
          {
              $match: { salons_id: new mongoose.Types.ObjectId(id) } 
          },
          {
            $lookup: {
                from: 'users',
                localField: 'user_id',     
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $lookup: {
                from: 'stylists',
                localField: 'selectedStylistId',     
                foreignField: '_id',
                as: 'stylists'
            }

        },
        {
            $unwind: {
              path: "$service_id",
              preserveNullAndEmptyArrays: true,
            },
          },
        {
            $lookup: {
                from: 'services', 
                localField: 'service_id',       
                foreignField: '_id',
                as: 'service' 
            }
        },
        {
            $lookup: {
              from: "services",
              let: { subCategoryId: "$service_id" },
              pipeline: [
                { $unwind: "$mainCategories" },
                { $unwind: "$mainCategories.subCategories" },
                {
                  $match: {
                    $expr: {
                      $eq: ["$mainCategories.subCategories._id", "$$subCategoryId"],
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    subCategories: { $push: "$mainCategories.subCategories" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    subCategories: 1,
                  },
                },
              ],
              as: "serviceData",
            },
          },
        {
            $project:{
                _id:1,
                customer_image:"$user.avatar",
                customer_name: {
                    $concat: [
                        { $arrayElemAt: ['$user.first_name', 0] }, 
                        ' ',                                        
                        { $arrayElemAt: ['$user.last_name', 0] } 
                    ]
                },
                appointment_date:"$dateforService",
                serviceData: { $first: "$serviceData.subCategories" },
                finale_amount:"$final_amount",
                stylist_name:{ $arrayElemAt: ['$stylists.stylist_name', 0] } ,
                booking_status:"$status",
                
            }
        }
        ])

        res.status(200).json({ success: true, data: orders });

    }catch(error){
       next(error)
    }
}

const showsalonservices  = async(req,res,next)=>{
    try{
        const { id } = req.params;

        if(!id){
            throw new ErrorHandler("id is required",400)
        }

        const salonservice = await salonsModel.findOne(
            {_id:id}
        ).populate({
            path: 'services',
            model: 'services',
        })

        return res.status(200).json({message:true,data:salonservice})

    }catch(error){
        next(error)
    }
}
  
module.exports={
    superadminstatistics,
    allsalonapproval,
    allbillinghistory,
    loginSuperAdmin,
    showallactivesalons,
    handlesalonactivetrue,
    showSalonDetails,
    showsalonbooking,
    showsalonservices
}

