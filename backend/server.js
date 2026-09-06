import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import shipmentRoutes from "./routes/shipmentRoutes.js";
import resendWebhook from "./routes/resendWebhook.js";
import { resolveLocationCoords } from "./utils/resolveLocationCoords.js";
import Shipment from "./models/shipmentModel.js";

dotenv.config({ path: "./.env" });

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api/shipments", shipmentRoutes);

// ONLY THIS (ONE) webhook route
app.use("/api/resend-webhook", resendWebhook);

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

app.get("/", (req, res) => res.send("✅Freight API is running..."));

// ─── Socket.IO (real-time flight tracking) ────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Expose the socket server to controllers (routes access it via req.app.get("io"))
app.set("io", io);

const toFlightPayload = (s) => {
  const originCoords = resolveLocationCoords(s.origin);
  const destinationCoords = resolveLocationCoords(s.destination);
  const routeCoords = (s.history ?? [])
    .map((h) => resolveLocationCoords(h.location))
    .filter((c) => Array.isArray(c) && c.length === 2);

  return {
    shipmentId: s.trackingId,
    trackingId: s.trackingId,
    origin: s.origin,
    destination: s.destination,
    status: s.status || "In Transit",
    originCoords,
    destinationCoords,
    routeCoords: routeCoords.length >= 2
      ? routeCoords
      : [originCoords, destinationCoords].filter(Boolean),
  };
};

io.on("connection", async (socket) => {
  console.log("🟢 Tracking client connected:", socket.id);

  try {
    // Push currently active (non-delivered) shipments to the new client
    const active = await Shipment.find({ status: { $ne: "Delivered" } })
      .sort({ createdAt: -1 })
      .limit(50);
    socket.emit("shipments:init", active.map(toFlightPayload));
  } catch (err) {
    console.error("Failed to emit shipment list:", err.message);
  }

  socket.on("disconnect", () => {
    console.log("🔴 Tracking client disconnected:", socket.id);
  });
});

// Broadcast a shipment whenever it is created (also used by controllers)
export function broadcastShipment(shipment) {
  io.emit("shipmentCreated", toFlightPayload(shipment));
}

server.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));