import Shipment from "../models/shipmentModel.js";
import { generateHistory, generateMovements } from "../utils/autoRoute.js";
import { resolveLocationCoords } from "../utils/resolveLocationCoords.js";

const toFlightPayload = (shipment) => {
  const originCoords = resolveLocationCoords(shipment.origin);
  const destinationCoords = resolveLocationCoords(shipment.destination);
  const routeCoords = (shipment.history ?? [])
    .map((h) => resolveLocationCoords(h.location))
    .filter((c) => Array.isArray(c) && c.length === 2);

  return {
    shipmentId: shipment.trackingId,
    trackingId: shipment.trackingId,
    origin: shipment.origin,
    destination: shipment.destination,
    status: shipment.status || "In Transit",
    originMode: shipment.originMode || "custom",
    originCoords,
    destinationCoords,
    routeCoords: routeCoords.length >= 2
      ? routeCoords
      : [originCoords, destinationCoords].filter(Boolean),
  };
};

// ✅ Get all shipments
const getShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find();
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get shipment by trackingId
const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ trackingId: req.params.id });
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Create shipment WITH auto travel history
// Status/lastLocation are intentionally NOT supplied by the client — the
// system derives them from the auto-generated route history.
const createShipment = async (req, res) => {
  try {
    const { trackingId, origin, destination, expectedDelivery, truckType, originMode } = req.body;
    const status = "In Transit";

    const history = generateHistory(origin, destination, status);
    const movements = generateMovements(origin, destination, status);

    const shipment = await Shipment.create({
      trackingId,
      origin,
      destination,
      status,
      expectedDelivery,
      truckType: truckType || "Dry Van",
      originMode: originMode || "custom",
      history,
      movements,
    });

    // ✅ Real-time broadcast to every connected dashboard
    const io = req.app.get("io");
    if (io) io.emit("shipmentCreated", toFlightPayload(shipment));

    res.status(201).json(shipment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ✅ Delete shipment (by _id)
const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });
    res.json({ message: "Shipment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get Travel History
const getShipmentHistory = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ trackingId: req.params.id });
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });
    res.json(shipment.history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Add New History Entry
const addShipmentHistory = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });

    shipment.history.push({
      date: new Date(),
      status: req.body.status,
      location: req.body.location,
      details: req.body.details,
    });

    await shipment.save();
    res.json(shipment.history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
  getShipments,
  getShipmentById,
  createShipment,
  deleteShipment,
  getShipmentHistory,
  addShipmentHistory,
};
