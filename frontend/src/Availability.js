import React, { useState, useEffect } from "react";
import "./Availability.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

// Define the fixed day order and a mapping from abbreviations to full names.
const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const fullDayNames = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export default function AvailabilityAdmin() {
  const token = localStorage.getItem("token");

  // Default state for availability (this serves as a placeholder until backend data loads)
  const [availability, setAvailability] = useState({
    mon: { start: "09:00", end: "18:00", enabled: true },
    tue: { start: "09:00", end: "18:00", enabled: true },
    wed: { start: "09:00", end: "18:00", enabled: true },
    thu: { start: "09:00", end: "18:00", enabled: true },
    fri: { start: "09:00", end: "18:00", enabled: true },
    sat: { start: "10:00", end: "16:00", enabled: false },
    sun: { start: "10:00", end: "16:00", enabled: false },
  });
  const [exclusions, setExclusions] = useState([]);
  const [showTimeslotModal, setShowTimeslotModal] = useState(false);
  const [currentDay, setCurrentDay] = useState(null);
  const [modalData, setModalData] = useState({ start: "", end: "" });
  const [exclusionModal, setExclusionModal] = useState({
    show: false,
    mode: "create",
    index: null,
    data: { date: "", note: "" },
  });

  // -----------------------
  // Fetch availability from backend
  const fetchAvailability = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Convert array of records into an object keyed by day
      const availObj = {};
      data.forEach((rec) => {
        availObj[rec.day] = {
          start: rec.start,
          end: rec.end,
          enabled: rec.enabled,
        };
      });
      setAvailability(availObj);
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
  };

  // Fetch exclusions from backend
  const fetchExclusions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/exclusions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const formatted = data.map((ex) => ({
        id: ex.id,
        date: new Date(ex.date).toISOString().split("T")[0],
        note: ex.note,
      }));
      setExclusions(formatted);
    } catch (error) {
      console.error("Error fetching exclusions:", error);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchExclusions();
  }, []);

  // -----------------------
  // Update availability on backend
  const updateAvailability = async (updates) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const result = await res.json();
      if (result.success) {
        console.log("Availability updated successfully");
      }
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  };

  // Save timeslot changes from modal and update backend
  const saveTimeslot = () => {
    setAvailability((prev) => {
      const updated = {
        ...prev,
        [currentDay]: { ...prev[currentDay], start: modalData.start, end: modalData.end },
      };
      updateAvailability(updated);
      return updated;
    });
    setShowTimeslotModal(false);
  };

  // Handle toggling a day’s enabled status
  const handleToggle = (day, checked) => {
    setAvailability((prev) => {
      const updated = {
        ...prev,
        [day]: { ...prev[day], enabled: checked },
      };
      updateAvailability(updated);
      return updated;
    });
  };

  // Open modal for editing a day’s timeslot
  const openTimeslotModal = (day) => {
    setCurrentDay(day);
    setModalData({
      start: availability[day].start,
      end: availability[day].end,
    });
    setShowTimeslotModal(true);
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => ({ ...prev, [name]: value }));
  };

  // -----------------------
  // Exclusion functions
  const openExclusionModal = (mode, index = null) => {
    if (mode === "create") {
      setExclusionModal({
        show: true,
        mode: "create",
        index: null,
        data: { date: "", note: "" },
      });
    } else if (mode === "edit") {
      setExclusionModal({
        show: true,
        mode: "edit",
        index,
        data: { ...exclusions[index] },
      });
    }
  };

  const handleExclusionChange = (e) => {
    const { name, value } = e.target;
    setExclusionModal((prev) => ({
      ...prev,
      data: { ...prev.data, [name]: value },
    }));
  };

  const saveExclusion = async () => {
    if (exclusionModal.mode === "create") {
      try {
        const res = await fetch(`${API_URL}/api/admin/exclusions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(exclusionModal.data),
        });
        const newExclusion = await res.json();
        newExclusion.date = new Date(newExclusion.date).toISOString().split("T")[0];
        setExclusions((prev) => [...prev, newExclusion]);
      } catch (error) {
        console.error("Error creating exclusion:", error);
      }
    } else if (exclusionModal.mode === "edit" && exclusionModal.index !== null) {
      const exclusionId = exclusions[exclusionModal.index].id;
      try {
        const res = await fetch(`${API_URL}/api/admin/exclusions/${exclusionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(exclusionModal.data),
        });
        const updatedExclusion = await res.json();
        updatedExclusion.date = new Date(updatedExclusion.date)
          .toISOString()
          .split("T")[0];
        setExclusions((prev) =>
          prev.map((ex, idx) => (idx === exclusionModal.index ? updatedExclusion : ex))
        );
      } catch (error) {
        console.error("Error updating exclusion:", error);
      }
    }
    setExclusionModal({ show: false, mode: "create", index: null, data: { date: "", note: "" } });
  };

  const deleteExclusion = async (index) => {
    if (window.confirm("Are you sure you want to delete this exclusion?")) {
      const exclusionId = exclusions[index].id;
      try {
        await fetch(`${API_URL}/api/admin/exclusions/${exclusionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setExclusions((prev) => prev.filter((_, idx) => idx !== index));
      } catch (error) {
        console.error("Error deleting exclusion:", error);
      }
    }
  };

  return (
    <div className="booking-types-admin-container">
      {/* Header Section */}
      <div className="header-section">
        <div>
          <h2>Availability</h2>
          <p>Manage your availability timeslots and exceptions for customer bookings.</p>
        </div>
      </div>

      {/* Availability List (Fixed order using dayOrder) */}
      <div className="booking-types-list">
        {dayOrder.map((day) => {
          const config = availability[day];
          return (
            <div key={day} className="booking-type-item">
              <div className="type-info">
                <div className="type-name">{fullDayNames[day]}</div>
                <div className="type-description">
                  {config.enabled ? `${config.start} - ${config.end}` : "Disabled"}
                </div>
              </div>
              <div className="actions">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => handleToggle(day, e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
                <button className="edit-btn" onClick={() => openTimeslotModal(day)} title="Edit">
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="divider"></div>

      {/* Exclusions Section */}
      <div className="exclusions-section">
        <div className="exclusions-header">
          <h2>Exclusions</h2>
          <button className="new-btn" onClick={() => openExclusionModal("create")}>
            + Add Exclusion
          </button>
        </div>
        <p className="exclusions-description">
          Add dates here to prevent customers from booking on specific days (such as holidays, maintenance, or closures).
        </p>
        {exclusions.length === 0 ? (
          <div className="empty-list">No exclusions added.</div>
        ) : (
          <div className="booking-types-list">
            {exclusions.map((ex, idx) => (
              <div key={ex.id || idx} className="booking-type-item">
                <div className="type-info">
                  <div className="type-name">{ex.date}</div>
                  <div className="type-description">{ex.note}</div>
                </div>
                <div className="actions">
                  <button className="edit-btn" onClick={() => openExclusionModal("edit", idx)} title="Edit">
                    Edit
                  </button>
                  <button className="delete-btn" onClick={() => deleteExclusion(idx)} title="Delete">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Editing Timeslot */}
      {showTimeslotModal && (
        <div className="modal-backdrop" onClick={() => setShowTimeslotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {fullDayNames[currentDay]} Timeslot</h3>
            <label>Start Time</label>
            <input type="time" name="start" value={modalData.start} onChange={handleModalChange} />
            <label>End Time</label>
            <input type="time" name="end" value={modalData.end} onChange={handleModalChange} />
            <div className="modal-actions">
              <button className="modal-save" onClick={saveTimeslot}>Save</button>
              <button className="modal-cancel" onClick={() => setShowTimeslotModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Adding / Editing Exclusion */}
      {exclusionModal.show && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setExclusionModal({ show: false, mode: "create", index: null, data: { date: "", note: "" } })
          }
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{exclusionModal.mode === "create" ? "Add" : "Edit"} Exclusion</h3>
            <label>Date</label>
            <input type="date" name="date" value={exclusionModal.data.date} onChange={handleExclusionChange} />
            <label>Note (optional)</label>
            <textarea
              type="text"
              name="note"
              value={exclusionModal.data.note}
              onChange={handleExclusionChange}
              placeholder="e.g., Holiday or Maintenance"
            />
            <div className="modal-actions">
              <button className="modal-save" onClick={saveExclusion}>
                Save
              </button>
              <button
                className="modal-cancel"
                onClick={() =>
                  setExclusionModal({ show: false, mode: "create", index: null, data: { date: "", note: "" } })
                }
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
