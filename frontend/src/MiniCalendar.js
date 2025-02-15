// MiniCalendar.js
import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import "./MiniCalendar.css";

export default function MiniCalendar({ onDateClick }) {
    return (
      <div className="mini-calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}       // Hide the default "March 2025" header
          fixedWeekCount={false}      // Let the month shrink to the actual weeks
          showNonCurrentDates={true}  // Show days from the next/previous month
          dateClick={onDateClick}     // This must match the prop name
          height="auto"
          contentHeight="auto"
        />
      </div>
    );
  }
