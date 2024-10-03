const mongoose = require("mongoose");
const validator = require("validator")

const userSchema = mongoose.Schema({
  first_name: {
    type: String,
    maxLength: [50, 'First Name can not exceed 10 characters'],
    minLength: [2, 'First Name Must have more than 2 Characters']
  },
  last_name: {
    type: String,
    maxLength: [50, 'Last Name can not exceed 20 characters'],
    minLength: [2, 'Last Name Must have more than 2 Characters']
  },
  email: {
    type: String,
    unique: true,
    validate: [validator.isEmail, 'Please Enter Validate Email Address']
  },
  phone: {
    type: String,
    unique: true,
    index: true,
    sparse: true
  },
  password: {
    type: String,
    select: false
  },
  role: {
    type: String,
    enum: ["normal", "admin", "partner","super"],
    default: "normal"
  },
  dob: {
    type: String
  },
  gender: {
    type: String
  },
  location:
  {
    place: {
      type: String,
    },
    house: {
      type: String,
    },
    landmark: {
      type: String
    },
    address_type: {
      type: String
    }
  },
  avatar: {
    public_url: {
      type: String,
    },
    key: {
      type: String,
    },
  },
  google: {
    type: String,
    default: "disconnect"
  },
  instagram: {
    type: String,
    default: "disconnect"
  },
  facebook: {
    type: String,
    default: "disconnect"
  },
  created: {
    type: Date,
    default: Date.now,
  },
  isPass:{
    type:Boolean,
    default:false
  },
  additionalInfo:{
    type:String
  },
  modified: {
    type: Date,
    default: Date.now,
  },
  deleted: {
    type: Date,
    default: Date.now,
  },
});


const userModel = mongoose.model("user", userSchema);


module.exports = {
  userModel,
};