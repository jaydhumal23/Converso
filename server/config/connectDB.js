const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");
dotenv.config();


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log(`DB Connected ${mongoose.connection.host}`.bgGreen.white);
    } catch (error) {
        console.log(`DB Connection Failed ${error}`.bgRed.white);

    }


}

module.exports = connectDB
