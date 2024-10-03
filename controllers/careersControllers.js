const CareerFormModel = require("../models/careersFormModel");
const CareersModel = require("../models/careersModel");
const { ErrorHandler } = require("../utills/errorHandler");

const uploadPDFfile=async(req,res,next)=>{
  try {
    if(!req.file){
      throw new ErrorHandler("Please upload a file",400)
    }
    const resume={
      public_url:req.file.location,
      key:req.file.key
    }
    return res.status(200).json({success:true,resume})
  } catch (error) {
    next(error)
  }
}

const jobformaaplication = async (req, res,next) => {
  try {
      const { first_name, last_name, email, phone_number, career_id } = req.body;
      if (!first_name || !last_name || !email || !phone_number || !career_id) {
        throw new ErrorHandler("required all fields",400)
      }
      const newJoinForm = new CareerFormModel({
          first_name,
          last_name,
          email,
          phone_number,
          career_id
      });
      if (req.file) {
          newJoinForm.resume = {
              public_url: req.file.location, // Contains file details from the upload
              key: req.file.key // Contains file details from the upload
          };
      }
      await newJoinForm.save();


      return res.status(200).json({ success: true, message: 'Job form application submitted successfully' });
  } catch (error) {
     next(error)
  }
};

const careersjobdetail = async (req,res,next)=>{
  try{
    const  {job_title,job_location,role_experience,job_worffrom,descriptions}=req.body;

    if(!job_title || !job_location || !role_experience || !job_worffrom || !descriptions){
      throw new ErrorHandler("required all fields",400)
    }
    const NewJob = new CareersModel({
      job_title,job_location,role_experience,job_worffrom,descriptions
    })


    await NewJob.save()
    return res.status(201).json({message:"job opening created"})


  }catch(error){
     next(error);
  }
}

const allopeningjob = async(req,res)=>{
  try{
    const alljobs  = await CareersModel.find({})
    return res.status(200).json({jobs:alljobs})

  }catch(error){
    next(error)
  }
}
  


module.exports={
    jobformaaplication,
    careersjobdetail,
    allopeningjob,uploadPDFfile
}