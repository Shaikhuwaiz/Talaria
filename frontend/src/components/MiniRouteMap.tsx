import React from "react";
import { Truck } from "lucide-react";

interface MiniRouteMapProps {
  origin: string;
  destination: string;
  status: string;
}

export default function MiniRouteMap({
  origin,
  destination,
  status,
}: MiniRouteMapProps) {
  const isDelivered = status === "Delivered";
  const isInTransit = status === "In Transit";

  if (!isDelivered && !isInTransit) {
    return null; // Do not show mini-map for Undelivered
  }

  return (
    <div className="w-full bg-white rounded-xl p-6 shadow-md flex flex-col items-center">
      <h3 className="text-gray-800 font-semibold mb-4">Shipment Route</h3>

      <div className="relative w-full flex justify-between items-center">
        
        {/* Origin Pin */}
        <div className="flex flex-col items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-700 mt-1">{origin}</span>
        </div>

        {/* Horizontal Line + Truck */}
        <div className="relative w-2/3 h-1 bg-gray-300 rounded-full mx-2">

          {/* Truck Icon */}
          <Truck
            className="text-blue-600 absolute -top-4"
            size={28}
            style={{
              left: isDelivered ? "90%" : isInTransit ? "50%" : "0%",
              transition: "left 1.5s ease-in-out",
            }}
          />
        </div>

        {/* Destination Pin */}
        <div className="flex flex-col items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-700 mt-1">{destination}</span>
        </div>
      </div>

      <p className="text-gray-600 mt-4 text-sm">
        {isDelivered ? "Delivered to destination" : "Package in transit"}
      </p>
    </div>
  );
}
