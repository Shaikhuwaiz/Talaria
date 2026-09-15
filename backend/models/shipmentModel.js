import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, required: true },
  location: { type: String, required: true },
  details: { type: String, required: true },
});

// ✅ Movement event logs (UPS/FedEx-style tracking timeline)
const movementSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    location: { type: String, required: true },
    timestamp: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    details: { type: String, default: "" },
    delayed: { type: Boolean, default: false },
    delayReason: { type: String, default: "" },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    contactName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    trackingId: { type: String, required: true, unique: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    lastLocation: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Delivered", "In Transit", "Undelivered"],
      default: "In Transit",
    },
    expectedDelivery: { type: Date, required: true },
    truckType: {
      type: String,
      enum: ["Dry Van", "Flatbed", "Reefer", "Step Deck", "Box Truck", "Logging Truck"],
      default: "Dry Van",
    },
    originMode: {
      type: String,
      enum: ["warehouse", "custom"],
      default: "custom",
    },

    // ✅ Billing + contact info captured at booking
    weight: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    service: { type: String, default: "" },
    servicePrice: { type: Number, default: 0 },
    insuranceFee: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    sender: { type: contactSchema, default: () => ({}) },
    recipient: { type: contactSchema, default: () => ({}) },

    // ✅ History is INSIDE schema now
    history: {
      type: [historySchema],
      default: [],
    },

    // ✅ Movement event timeline (Order Created → Departed → In Transit → Out for Delivery → Delivered)
    movements: {
      type: [movementSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Shipment = mongoose.model("Shipment", shipmentSchema);
export default Shipment;
