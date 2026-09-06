import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, required: true },
  location: { type: String, required: true },
  details: { type: String, required: true },
});

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
      enum: ["Dry Van", "Flatbed", "Reefer", "Step Deck", "Box Truck"],
      default: "Dry Van",
    },

    // ✅ History is INSIDE schema now
    history: {
      type: [historySchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Shipment = mongoose.model("Shipment", shipmentSchema);
export default Shipment;
