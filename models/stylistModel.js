const mongoose = require('mongoose');
const {paginationPlugin } = require('../plugins/pagination');
const {reviewSchema} = require('../models/reviewSchema')

const stylistSchema = mongoose.Schema({
    
    services:[{
        type: mongoose.Schema.Types.ObjectId,ref : 'service'
    }],
    stylist_name:{
        type : String,
        required :true
    },
    stylist_service:{
        type : String,
        required :true
    },
    stylist_address:{
        type : String,
        //required :true
    },
    stylist_Img:{
        public_url : {
            type:String,
           // required: true
        },
        key: {
            type:String,
           // required: true
        }
    },
    time_of_service:[
        {
            day:{
                type:String
            },
            slots:[
                {
                    start_time : {
                        type : String
                    },
                    end_time : {
                        type : String}
                }
            ]
        }
    ],
    time_for_service : [{
        date : {
            type : String 
        },
        shifts:[
            {
                start_time : {
                    type : String
                },
                end_time : {
                    type : String}
            }
        ],
        isOnLeave : {
            type : Boolean,
            default : false
        },
        isOnPartialLeave:{
            type : Boolean,
            default : false
        },
        isClosed : {
            type : Boolean,
            default : false
        },
        time_slots :[{
        slot:{
            type : String
        },
        isBooked:{
            type : Boolean,
            default : false
        },
        }]

    }],
    stylist_number:{
      type:String,
     // required:true
    },
    rating:{
        type:Number
    },
    reviews : [reviewSchema],
    created:{
        type: Date,
        default: Date.now,
    },
    modified:{
        type: Date,
        default:null,
    },
    deleted:{
        type: Date,
        default: null,
    }
});

stylistSchema.plugin(paginationPlugin);

const stylistModel = mongoose.model('stylist',stylistSchema)

module.exports = {
  stylistModel
}