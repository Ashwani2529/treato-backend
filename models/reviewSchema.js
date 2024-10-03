const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user:{
    type: mongoose.Schema.Types.ObjectId,ref : 'user',
    required: true
},
  text: {
    type: String,
   // required: true,
  },
  rating: {
    type: Number,
    //required: true,
  },
  created_at: {
    type: Date,
    //default: Date.now,
  },
});

module.exports = {
    reviewSchema
}