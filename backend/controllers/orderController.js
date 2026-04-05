import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ===============================
// PLACE ORDER
// ===============================
const placeOrder = async (req, res) => {

    const frontend_url = "http://localhost:5174";

    try {
        console.log("USER ID (from middleware):", req.userId); // 🔍 debug

        if (!req.userId) {
            return res.json({ success: false, message: "User not authenticated" });
        }

        const newOrder = new orderModel({
            userId: req.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address
        });

        await newOrder.save();

        // Clear user cart
        await userModel.findByIdAndUpdate(req.userId, { cartData: {} });

        // Stripe line items
        const line_items = req.body.items.map((item) => ({
            price_data: {
                currency: "inr",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }));

        // Delivery charge
        line_items.push({
            price_data: {
                currency: "inr",
                product_data: {
                    name: "Delivery Charges"
                },
                unit_amount: 2 * 100
            },
            quantity: 1,
        });

        // Create Stripe session
        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: 'payment',
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        });

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log("placeOrder Error:", error);
        res.json({ success: false, message: "Error placing order" });
    }
};

// ===============================
// VERIFY ORDER
// ===============================
const verifyOrder = async (req, res) => {

    const { orderId, success } = req.body || req.query;

    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Paid" });
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Not Paid" });
        }
    } catch (error) {
        console.log("verifyOrder Error:", error);
        res.json({ success: false, message: "Error verifying order" });
    }
};

// ===============================
// USER ORDERS
// ===============================
const userOrders = async (req, res) => {

    try {
        console.log("Fetching orders for user:", req.userId); 

        if (!req.userId) {
            return res.json({ success: false, message: "User not authenticated" });
        }

        const orders = await orderModel.find({
            userId: req.userId
        });

        res.json({ success: true, data: orders });

    } catch (error) {
        console.log("userOrders Error:", error);
        res.json({ success: false, message: "Error fetching orders" });
    }
};

// ===============================
// ADMIN: LIST ALL ORDERS
// ===============================
const listOrders = async (req, res) => {

    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders });

    } catch (error) {
        console.log("listOrders Error:", error);
        res.json({ success: false, message: "Error fetching all orders" });
    }
};

// ===============================
// UPDATE ORDER STATUS
// ===============================
const updateStatus = async (req, res) => {

    try {
        await orderModel.findByIdAndUpdate(
            req.body.orderId,
            { status: req.body.status }
        );

        res.json({ success: true, message: "Status Updated" });

    } catch (error) {
        console.log("updateStatus Error:", error);
        res.json({ success: false, message: "Error updating status" });
    }
};

export {
    placeOrder,
    verifyOrder,
    userOrders,
    listOrders,
    updateStatus
};