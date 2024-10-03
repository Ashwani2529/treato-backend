const mongoose = require('mongoose')

const blogsSchema = mongoose.Schema({

    blog_name: {
        type: String,
        require: true
    },
    blog_main_title: {
        type: String,
        required :true
    },
    writer_name: {
        type: String,
    },
    blog_description:{
        type : String
    },
    blog_profile_img:{
        public_url: {
            type: String,
            required: true
        },
        key: {
            type: String,
             required: true
        }
    },
    blog_main_img: {
        public_url: {
            type: String,
            required: true
        },
        key: {
            type: String,
            required: true
        }
    },
    blog_details: [{
        blog_title: {
            type: String
        },
        blog_description: {
            type: String,
        },
        sub_blog_imag:{
            public_url : {
                type:String,
                required: true
            },
            key: {
                type:String,
                required: true
            }
        }
    }],
    time_for_read_blog:{
        type:String,
        required : true
    },
    visiting_time: {
        type: Number,
        default: 0
    },
    social_media_url: [{
        facebook: {
            type: String
        },
        twitter: {
            type: String,
        },
        instagram: {
            type: String,
        },
        copyLink: {
            type: String,
        }
    }],
    created: {
        type: Date,
        default: Date.now(),
    },
    modified: {
        type: Date,
        default: null,
    },
    deleted: {
        type: Date,
        default: null,
    }
});

const blogModel = mongoose.model('blog', blogsSchema)

module.exports = {
    blogModel
}


//one question Price image would from the userModel or need add add Sepretly 