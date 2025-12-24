import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyOtp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const email = state?.email;

  const handleVerify = async () => {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/auth/verify-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      setError(data.message);
      return;
    }

    navigate("/reset-password", { state: { email } });
  };

  return (
    <>
      <h2>Verify OTP</h2>
      {error && <p>{error}</p>}
      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
      />
      <button onClick={handleVerify}>Verify</button>
    </>
  );
}
