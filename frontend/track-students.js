import { Session } from "./session.js";
import { BASE_URL } from "./config.js";

// ==============================
// Fetch all students (admin only)
// ==============================
async function fetchStudents() {
  try {
    const res = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch students");
    const data = await res.json();
    return data.students || [];
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "Failed to Load Students",
      text: "Please login again.",
      confirmButtonColor: "#1a9fff",
    }).then(() => {
      Session.clear();
      window.location.href = "login.html";
    });
    return [];
  }
}

// ==============================
// Initialize Track Students tab
// ==============================
export async function initTrackStudents() {
  const students = await fetchStudents();
  const select = document.getElementById("student-select");
  const nameDisplay = document.getElementById("student-name");
  const chartSection = document.getElementById("student-charts");
  const sessionsList = document.getElementById("student-sessions");
  let studentChart;

  if (!select) return;

  // Populate dropdown
  select.innerHTML = `<option value="">-- Choose a student --</option>`;
  students.forEach((s) => {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = `${s.first_name} ${s.last_name}`;
    select.appendChild(option);
  });

  // On selection change
  select.addEventListener("change", async () => {
    const studentId = select.value;

    if (!studentId) {
      chartSection.style.display = "none";
      return;
    }

    try {
      // Fetch student details including upcoming sessions
      const res = await fetch(`${BASE_URL}/students/${studentId}`, {
        headers: { Authorization: `Bearer ${Session.token()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch student details");
      const student = await res.json();

      // Update student name
      nameDisplay.textContent = `${student.first_name} ${student.last_name}'s Progress`;
      chartSection.style.display = "block";

      // Render chart
      const ctx = document
        .getElementById("track-student-chart")
        .getContext("2d");
      const data = {
        labels: [
          "Points",
          "Projects",
          "Attendance (Week)",
          "Attendance (Month)",
        ],
        datasets: [
          {
            label: "Performance Metrics",
            data: [
              student.points ?? 0,
              student.projects_done ?? 0,
              student.attendance_week ?? 0,
              student.attendance_month ?? 0,
            ],
            backgroundColor: ["#1a9fff", "#17c964", "#f5a623", "#d14c32"],
            borderRadius: 6,
          },
        ],
      };
      const config = { type: "bar", data, options: { responsive: true } };
      if (studentChart) studentChart.destroy();
      studentChart = new Chart(ctx, config);

      // Render upcoming sessions
      if (sessionsList) {
        sessionsList.innerHTML = "";
        if (student.upcoming_sessions?.length) {
          student.upcoming_sessions.forEach((s) => {
            const li = document.createElement("li");
            const dateStr = s.date ? new Date(s.date).toLocaleDateString() : "";
            const timeStr = s.time || "";
            const topicStr = s.topic || "No topic";
            li.textContent = `${dateStr}${dateStr ? " - " : ""}${timeStr}${
              timeStr ? " - " : ""
            }${topicStr}`;
            sessionsList.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.textContent = "No upcoming sessions";
          sessionsList.appendChild(li);
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error loading student data.",
        confirmButtonColor: "#1a9fff",
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", initTrackStudents);
// this is just for testing
