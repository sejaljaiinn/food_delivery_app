import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect("mongodb+srv://sejaljain:SejalJain11@cluster0.in5myfz.mongodb.net/food-delivery?retryWrites=true&w=majority").then(()=>console.log("DB Connected")) ;
}