const mongoose = require("mongoose");

const subCategorySchema = mongoose.Schema({
  service_name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
  },
  time_takenby_service: {
    type: String,
  },
});


const mainCategorySchema = mongoose.Schema({
  category_name: {
    type: String,
    required: true,
  },
  color:{
   type:String
  },
  subCategories: [subCategorySchema],
  service_timing: {
    date: {
      type: Date,
    },
    start_time: {
      type: String,
    },
  }
});

const serviceSchema = mongoose.Schema({
  salonId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "salons",
    required: true,
  },
  service_name: {
    type: String,
    required: true,
  },
  service_description: {
    type: String,
  },
  service_img: {
    public_url: {
      type: String,
    },
    key: {
      type: String,
    },
  },
  mainCategories: [mainCategorySchema],
  
  created: {
    type: Date,
    default: Date.now,
  },
  modified: {
    type: Date,
  },
  deleted: {
    type: Date,
    default: null,
  },
});

const serviceModel = mongoose.model("services", serviceSchema);

module.exports = {
  serviceModel
};


