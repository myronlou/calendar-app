import React, { useState, useEffect } from "react";
import "./Availability.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

// Fixed day order and mapping for full day names
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

/* 
  Helper function: formatLocalTime
  Converts a stored UTC time string to the admin's local time string "HH:MM".
  E.g. if the stored value is "2025-02-21T15:00:00.000Z" and the admin is in UTC–5, this returns "10:00".
*/
function formatLocalTime(dateString) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatLocalDate(dateString) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getExclusionDisplay(ex) {
  // If no times are provided, assume whole day is excluded.
  if (!ex.startTime && !ex.endTime) {
    return " (Whole day excluded)";
  }
  
  // If an endDate is provided and it differs from the startDate, assume multi‑day exclusion.
  if (ex.endDate && ex.endDate !== ex.startDate) {
    if (ex.startTime && ex.endTime) {
      return ` (From ${ex.startTime} on ${ex.startDate} to ${ex.endTime} on ${ex.endDate})`;
    } else if (ex.startTime) {
      return ` (From ${ex.startTime} on ${ex.startDate})`;
    } else if (ex.endTime) {
      return ` (From ${ex.startDate} to ${ex.endTime} on ${ex.endDate})`;
    }
  } else {
    // Single-day exclusion (or no endDate)
    if (ex.startTime && ex.endTime) {
      return ` (Excluding ${ex.startTime} - ${ex.endTime})`;
    } else if (ex.startTime) {
      return ` (From ${ex.startTime} to the next day)`;
    } else if (ex.endTime) {
      return ` (From start of the day (midnight) until ${ex.endTime})`;
    }
  }
  return "";
}

export default function AvailabilityAdmin() {
  const token = localStorage.getItem("token");

  // Availability state (for each day)
  const [availability, setAvailability] = useState({
    mon: { start: "09:00", end: "18:00", enabled: true },
    tue: { start: "09:00", end: "18:00", enabled: true },
    wed: { start: "09:00", end: "18:00", enabled: true },
    thu: { start: "09:00", end: "18:00", enabled: true },
    fri: { start: "09:00", end: "18:00", enabled: true },
    sat: { start: "10:00", end: "16:00", enabled: false },
    sun: { start: "10:00", end: "16:00", enabled: false },
  });

  // Exclusions state
  const [exclusions, setExclusions] = useState([]);
  const [showTimeslotModal, setShowTimeslotModal] = useState(false);
  const [currentDay, setCurrentDay] = useState(null);
  const [modalData, setModalData] = useState({ start: "", end: "" });
  const [exclusionModal, setExclusionModal] = useState({
    show: false,
    mode: "create",
    index: null,
    data: { startDate: "", endDate: "", note: "", startTime: "", endTime: "" },
  });
  // State for error messages in the exclusion modal
  const [exclusionError, setExclusionError] = useState("");

  // Fetch availability from backend
  const fetchAvailability = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
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
        startDate: ex.start ? formatLocalDate(ex.start) : "",
        endDate: ex.end ? formatLocalDate(ex.end) : "",
        startTime: ex.start ? formatLocalTime(ex.start) : "",
        endTime: ex.end ? formatLocalTime(ex.end) : "",
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

  // Save timeslot changes from modal (for daily availability)
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

  // Handle toggling a day's availability
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

  // Open timeslot modal for editing a day's timeslot
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

  // Frontend validation function for the exclusion modal
  const validateExclusion = (data) => {
    if (!data.startDate) {
      return "";
    }
    const sDate = new Date(data.startDate);
    if (isNaN(sDate.getTime())) {
      return "Invalid start date format";
    }
    if (data.endDate) {
      const eDate = new Date(data.endDate);
      if (isNaN(eDate.getTime())) {
        return "Invalid end date format";
      }
      if (eDate < sDate) {
        return "End date cannot be before start date";
      }
      // If same day, and both times are provided, ensure end time is after start time
      if (data.startDate === data.endDate && data.startTime && data.endTime) {
        const sTime = new Date(`${data.startDate}T${data.startTime}:00`);
        const eTime = new Date(`${data.endDate}T${data.endTime}:00`);
        if (sTime >= eTime) {
          return "On the same day, end time must be after start time";
        }
      }
    } else {
      // No end date means same day validation
      if (data.startTime && data.endTime) {
        const sTime = new Date(`${data.startDate}T${data.startTime}:00`);
        const eTime = new Date(`${data.startDate}T${data.endTime}:00`);
        if (sTime >= eTime) {
          return "On the same day, end time must be after start time";
        }
      }
    }
    return "";
  };

  useEffect(() => {
    const errorMsg = validateExclusion(exclusionModal.data);
    setExclusionError(errorMsg);
  }, [exclusionModal.data]);

  // Exclusion modal functions
  const openExclusionModal = (mode, index = null) => {
    if (mode === "create") {
      setExclusionModal({
        show: true,
        mode: "create",
        index: null,
        data: { startDate: "", endDate: "", note: "", startTime: "", endTime: "" },
      });
      setExclusionError("");
    } else if (mode === "edit") {
      setExclusionModal({
        show: true,
        mode: "edit",
        index,
        data: { ...exclusions[index] },
      });
      setExclusionError("");
    }
  };

  const handleExclusionChange = (e) => {
    const { name, value } = e.target;
    setExclusionModal((prev) => ({
      ...prev,
      data: { ...prev.data, [name]: value },
    }));
    // Clear any existing error when user changes input
    setExclusionError("");
  };

  const saveExclusion = async () => {
    const validationError = validateExclusion(exclusionModal.data);
    if (validationError) {
      setExclusionError(validationError);
      return;
    } else {
      setExclusionError("");
    }

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
        const formatted = {
          id: newExclusion.id,
          startDate: newExclusion.start ? formatLocalDate(newExclusion.start) : "",
          endDate: newExclusion.end ? formatLocalDate(newExclusion.end) : "",
          startTime: newExclusion.start ? formatLocalTime(newExclusion.start) : "",
          endTime: newExclusion.end ? formatLocalTime(newExclusion.end) : "",
          note: newExclusion.note,
        };
        setExclusions((prev) => [...prev, formatted]);
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
        const formatted = {
          id: updatedExclusion.id,
          startDate: updatedExclusion.start ? formatLocalDate(updatedExclusion.start) : "",
          endDate: updatedExclusion.end ? formatLocalDate(updatedExclusion.end) : "",
          startTime: updatedExclusion.start ? formatLocalTime(updatedExclusion.start) : "",
          endTime: updatedExclusion.end ? formatLocalTime(updatedExclusion.end) : "",
          note: updatedExclusion.note,
        };

        setExclusions((prev) =>
          prev.map((ex, idx) => (idx === exclusionModal.index ? formatted : ex))
        );
      } catch (error) {
        console.error("Error updating exclusion:", error);
      }
    }
    setExclusionModal({
      show: false,
      mode: "create",
      index: null,
      data: { startDate: "", endDate: "", note: "", startTime: "", endTime: "" },
    });
    setExclusionError("");
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

      {/* Availability List */}
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
          Add exclusions to prevent bookings. You can specify:
          <br />
          - A start date (required) and optional end date (to span multiple days).
          <br />
          - Optional start and end times to exclude only part of a day.
        </p>
        {exclusions.length === 0 ? (
          <div className="empty-list">No exclusions added.</div>
        ) : (
          <div className="booking-types-list">
            {exclusions.map((ex, idx) => (
              <div key={ex.id || idx} className="booking-type-item">
                <div className="type-info">
                  <div className="type-name">
                    {ex.endDate ? `${ex.startDate} - ${ex.endDate}` : ex.startDate}
                  </div>
                  <div className="type-description">
                    {ex.note && <span>{ex.note}</span>}
                    {(ex.startTime || ex.endTime) && (
                      <span>{getExclusionDisplay(ex)}</span>
                    )}
                    {!(ex.startTime || ex.endTime) && <span> (Whole day excluded)</span>}
                  </div>
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

      {/* Timeslot Modal */}
      {showTimeslotModal && (
        <div className="modal-backdrop" onClick={() => setShowTimeslotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {fullDayNames[currentDay]} Timeslot</h3>
            <label>Start Time</label>
            <input type="time" name="start" value={modalData.start} onChange={handleModalChange} />
            <label>End Time</label>
            <input type="time" name="end" value={modalData.end} onChange={handleModalChange} />
            <div className="modal-actions">
              <button className="modal-save" onClick={saveTimeslot}>
                Save
              </button>
              <button className="modal-cancel" onClick={() => setShowTimeslotModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exclusion Modal */}
      {exclusionModal.show && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setExclusionModal({
              show: false,
              mode: "create",
              index: null,
              data: { startDate: "", endDate: "", note: "", startTime: "", endTime: "" },
            })
          }
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{exclusionModal.mode === "create" ? "Add" : "Edit"} Exclusion</h3>
            {/* Display interactive error (if any) right after date/time rows */}
            {exclusionError && <div className="error-message">{exclusionError}</div>}
            <div className="date-row">
              <div className="input-group">
                <label>Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={exclusionModal.data.startDate}
                  onChange={handleExclusionChange}
                />
              </div>
              <div className="input-group">
                <label>End Date (optional)</label>
                <input
                  type="date"
                  name="endDate"
                  value={exclusionModal.data.endDate}
                  onChange={handleExclusionChange}
                />
              </div>
            </div>
            <div className="time-row">
              <div className="input-group">
                <label>Start Time (optional)</label>
                <input
                  type="time"
                  name="startTime"
                  value={exclusionModal.data.startTime}
                  onChange={handleExclusionChange}
                />
              </div>
              <div className="input-group">
                <label>End Time (optional)</label>
                <input
                  type="time"
                  name="endTime"
                  value={exclusionModal.data.endTime}
                  onChange={handleExclusionChange}
                />
              </div>
            </div>
            <div className="info-row">
              <p className="small-note">
                If an end date is provided, the exclusion spans from the start date/time to the end date/time.
                Leave times blank to exclude the whole day.
              </p>
            </div>
            <div className="note-row">
              <label>Note (optional)</label>
              <textarea
                name="note"
                value={exclusionModal.data.note}
                onChange={handleExclusionChange}
                placeholder="e.g., Holiday or Maintenance"
              />
            </div>
            <div className="modal-actions">
              <button className="modal-save" onClick={saveExclusion}>
                Save
              </button>
              <button
                className="modal-cancel"
                onClick={() =>
                  setExclusionModal({
                    show: false,
                    mode: "create",
                    index: null,
                    data: { startDate: "", endDate: "", note: "", startTime: "", endTime: "" },
                  })
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
