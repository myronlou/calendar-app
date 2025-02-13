import React, { useState, useEffect } from "react";
import "./BookingTypes.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

// Predefined color set + "none"
const colorOptions = [
  { name: "No color", value: "" },         // empty string = no color
  { name: "Red", value: "#FF0000" },
  { name: "Orange", value: "#FF7F00" },
  { name: "Yellow", value: "#FFC72C" },
  { name: "Green", value: "#00FF00" },
  { name: "Teal", value: "#008080" },
  { name: "Blue", value: "#0000FF" },
  { name: "Purple", value: "#800080" },
  { name: "Pink", value: "#FF69B4" },
  { name: "Brown", value: "#8B4513" },
  { name: "Gray", value: "#808080" },
  { name: "Black", value: "#000000" },
  { name: "White", value: "#FFFFFF" },
];

function BookingTypesAdmin() {
  const [bookingTypes, setBookingTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [error, setError] = useState("");

  // Data for new or edited booking type
  const [modalData, setModalData] = useState({
    id: null,
    name: "",
    description: "",
    duration: "",
    color: "",
  });

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/booking-types`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch booking types");
        const data = await res.json();
        setBookingTypes(data);
      } catch (err) {
        console.error(err);
        setError("Error loading booking types.");
      }
    };
    fetchTypes();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setModalData({
      id: null,
      name: "",
      description: "",
      duration: "",
      color: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (type) => {
    setModalMode("edit");
    setModalData({
      id: type.id,
      name: type.name,
      description: type.description || "",
      duration: type.duration?.toString() || "", // convert to string for input
      color: type.color || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!modalData.name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    if (!modalData.duration) {
      setError("Duration must not be empty.");
      return;
    }

    try {
      if (modalMode === "create") {
        // Create new booking type
        const res = await fetch(`${API_URL}/api/admin/booking-types`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: modalData.name,
            duration: parseInt(modalData.duration, 10),
            description: modalData.description.trim() || null,
            color: modalData.color || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to create booking type");
        const createdType = await res.json();
        setBookingTypes((prev) => [...prev, createdType]);
      } else {
        // Edit existing booking type
        const { id } = modalData;
        const res = await fetch(`${API_URL}/api/admin/booking-types/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: modalData.name,
            duration: parseInt(modalData.duration, 10),
            description: modalData.description.trim() || null,
            color: modalData.color || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update booking type");
        const updatedType = await res.json();
        setBookingTypes((prev) =>
          prev.map((t) => (t.id === updatedType.id ? updatedType : t))
        );
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      setError("Error saving booking type.");
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm("Are you sure you want to delete this booking type?")) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/booking-types/${typeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete booking type");
      setBookingTypes((prev) => prev.filter((t) => t.id !== typeId));
    } catch (err) {
      console.error(err);
      setError("Error deleting booking type.");
    }
  };

  return (
    <div className="booking-types-admin-container">
      {/* Header Section */}
      <div className="header-section">
        <div>
          <h2>Booking Types</h2>
          <p>Create events for people to book on your calendar.</p>
        </div>
        <button className="new-btn" onClick={openCreateModal}>
          + New
        </button>
      </div>

      {/* Booking Types List */}
      <div className="booking-types-list">
        {bookingTypes.length === 0 && (
          <div className="empty-list">No booking types available.</div>
        )}

        {bookingTypes.map((type) => (
          <div key={type.id} className="booking-type-item">
            {/* Color Dot on the left */}
            <div
              className="color-dot"
              style={{
                backgroundColor: type.color || "transparent",
                border: type.color ? "none" : "1px solid #ccc",
              }}
            />

            {/* Middle Info */}
            <div className="type-info">
              <div className="type-name">
                {type.name}
                <span className="type-meta"> / {type.duration || 0}m</span>
              </div>
              <div className="type-description">
                {type.description}
              </div>
            </div>

            {/* Actions (Edit / Delete) */}
            <div className="actions">
              <button
                className="edit-btn"
                onClick={() => openEditModal(type)}
                title="Edit"
              >
                Edit
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDelete(type.id)}
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Popup for Create or Edit */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()} // Prevent closing on inner click
          >
            <h3>{modalMode === "create" ? "Create" : "Edit"} Booking Type</h3>

            {/* Error Display */}
            {error && <div className="error-msg">{error}</div>} 

            <label>Name</label>
            <input
              type="text"
              name="name"
              value={modalData.name}
              onChange={handleModalChange}
              placeholder="e.g Pottery Lesson"
            />

            <label>Description</label>
            <textarea
              type="text"
              name="description"
              value={modalData.description}
              onChange={handleModalChange}
              placeholder="Description Associated with the Lesson"
            />

            <label>Duration (minutes)</label>
            <input
              type="number"
              name="duration"
              value={modalData.duration}
              onChange={handleModalChange}
              placeholder="30"
              min="1"
            />

            <label>Color for management</label>
            <select
              name="color"
              value={modalData.color}
              onChange={handleModalChange}
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="modal-save" onClick={handleSave}>
                Save
              </button>
              <button
                className="modal-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingTypesAdmin;
