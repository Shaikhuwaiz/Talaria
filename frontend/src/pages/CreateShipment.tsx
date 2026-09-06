import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Container, Truck, Snowflake, Layers, Box } from "lucide-react";

// ✔ Truck type options — standard US freight equipment
const TRUCK_TYPES = [
  { id: "Dry Van", icon: Container },
  { id: "Flatbed", icon: Truck },
  { id: "Reefer", icon: Snowflake, hint: "Refrigerated" },
  { id: "Step Deck", icon: Layers },
  { id: "Box Truck", icon: Box },
];

// ✔ Auto-generate AWB number
const generateAWB = () => {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `AWB${random}`;
};

const countries = [
  // U.S. cities only
  "New York", "Boston", "Chicago", "Seattle", "Miami", "San Francisco",
  "Los Angeles", "Memphis", "Louisville", "Atlanta", "Dallas", "Houston",
  "Denver", "Phoenix", "Portland", "Las Vegas", "Detroit", "Philadelphia",
  "Charlotte", "Austin", "Nashville", "Cincinnati", "Salt Lake City",
  "Jacksonville", "Kansas City", "Indianapolis", "Columbus", "Minneapolis",
  "New Orleans", "Pittsburgh", "Saint Louis", "San Diego", "San Antonio",
  "Cleveland", "Milwaukee",
  // U.S. states
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas",
  "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

export default function CreateShipment() {
  const navigate = useNavigate();

  // ✔ Auto set the AWB tracking ID
  const [trackingId] = useState(generateAWB());

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [truckType, setTruckType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!truckType) {
      setError("Select a truck type");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingId,
          origin,
          destination,
          expectedDelivery,
          truckType,
        }),
      });

      if (!res.ok) throw new Error(`Failed to create shipment (${res.status})`);

      await res.json();
      navigate("/orders");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h2 className="text-3xl font-semibold tracking-tight text-white">
        Create Shipment
      </h2>

      {error && (
        <div className="mt-5 text-red-400 text-sm border border-red-500/40 bg-red-500/10 p-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-xs text-neutral-400">
            Tracking ID (Auto-generated)
          </label>
          <input
            type="text"
            value={trackingId}
            readOnly
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-neutral-400 outline-none cursor-not-allowed font-semibold"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-neutral-400">
            Truck type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TRUCK_TYPES.map((t) => {
              const Icon = t.icon;
              const active = truckType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTruckType(t.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-4 text-sm font-medium transition-all ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-white"
                  }`}
                >
                  <Icon size={22} />
                  <span>{t.id}</span>
                  {t.hint && (
                    <span
                      className={`text-[10px] uppercase tracking-wider ${
                        active ? "text-neutral-500" : "text-neutral-600"
                      }`}
                    >
                      {t.hint}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-neutral-400">Origin</label>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white outline-none transition-colors focus:border-white"
          >
            <option value="">Select Origin City/State</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-neutral-400">
            Destination
          </label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white outline-none transition-colors focus:border-white"
          >
            <option value="">Select Destination City/State</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-neutral-400">
            Expected Delivery Date
          </label>
          <input
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white outline-none transition-colors focus:border-white"
          />
        </div>

        <p className="text-xs text-neutral-500">
          Status and location are tracked automatically along the delivery route.
        </p>

        <button
          type="submit"
          disabled={loading}
          className={`flex items-center justify-center gap-2 w-full rounded-full px-4 py-3 text-sm font-semibold transition ${
            loading
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Saving...
            </>
          ) : (
            "Save Shipment"
          )}
        </button>
      </form>
    </div>
  );
}