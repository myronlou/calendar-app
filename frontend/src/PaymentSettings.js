import React, { useEffect, useState } from "react";
import "./PaymentSettings.css";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function PaymentSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [stripePublicKey, setStripePublicKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/admin/payment-settings`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error("Failed to fetch payment settings");
        }
        const data = await res.json();
        if (data) {
          setIsEnabled(data.isEnabled || false);
          setStripePublicKey(data.stripePublicKey || "");
          setStripeSecretKey(data.stripeSecretKey || "");
        }
      } catch (err) {
        console.error(err);
        setError("Could not load payment settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/admin/payment-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isEnabled,
          stripePublicKey,
          stripeSecretKey
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update payment settings");
      }

      alert("Payment settings updated successfully!");
    } catch (err) {
      console.error(err);
      setError("Could not update payment settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-settings-container">
      <h2>Payment Settings</h2>
      {error && <div className="error-message">{error}</div>}
      {loading && <div>Loading...</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Enable Payment Requirement?</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="form-group">
          <label>Stripe Public Key</label>
          <input
            type="text"
            value={stripePublicKey}
            onChange={(e) => setStripePublicKey(e.target.value)}
            placeholder="pk_live_..."
          />
        </div>

        <div className="form-group">
          <label>Stripe Secret Key</label>
          <input
            type="text"
            value={stripeSecretKey}
            onChange={(e) => setStripeSecretKey(e.target.value)}
            placeholder="sk_live_..."
          />
        </div>

        <button type="submit" disabled={loading}>
          Save
        </button>
      </form>
    </div>
  );
}

export default PaymentSettings;
