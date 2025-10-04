// ==============================
// Student Dashboard
// ==============================
import { io } from "https://cdn.socket.io/4.5.4/socket.io.esm.min.js";
import { Session } from "./session.js";
import { fetchAndRenderBadges } from "./student-badges.js";
import { fetchAndRenderCertificates } from "./student-certificates.js";

import { BASE_URL, SOCKET_URL } from "./config.js";
const token = Session.token();

// ==============================
// Get logged-in student
// ==============================
async function getLoggedInStudent() {
  try {
    // 1️⃣ Get user info
    const resUser = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resUser.ok) throw new Error("Not logged in");
    const user = await resUser.json();
    if (user.role !== "student") throw new Error("Access denied");

    // 2️⃣ Get full student info
    const resStudent = await fetch(`${BASE_URL}/students/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resStudent.ok) throw new Error("Failed to fetch student info");
    const studentData = await resStudent.json();

    // Merge user info and student info
    return { ...user, ...studentData };
  } catch (err) {
    alert(err.message);
    window.location.href = "login.html";
    return null;
  }
}

// ==============================
// Create a progress bar element
// ==============================
function createProgressBar(label, value, max, color = "#1a9fff") {
  const wrapper = document.createElement("div");
  wrapper.className = "progress-bar-wrapper";

  const title = document.createElement("span");
  title.textContent = `${label}: ${value} / ${max}`;
  title.className = "progress-title";

  const bar = document.createElement("div");
  bar.className = "progress-bar";

  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = "0%";
  fill.style.background = color;

  bar.appendChild(fill);
  wrapper.appendChild(title);
  wrapper.appendChild(bar);

  setTimeout(() => {
    const percent = Math.min((value / max) * 100, 100);
    fill.style.width = percent + "%";
  }, 50);

  return wrapper;
}

// ==============================
// Format session for display
// ==============================
function formatSession(session) {
  if (!session) return "No session info";

  const dateStr = session.date
    ? new Date(session.date).toLocaleDateString()
    : "";
  const timeStr = session.time || "";
  const topicStr = session.topic || "No topic";

  return `${dateStr}${dateStr ? " - " : ""}${timeStr}${
    timeStr ? " - " : ""
  }${topicStr}`;
}

// ==============================
// Update student dashboard
// ==============================
export async function updateDashboard() {
  const homeLoader = document.getElementById("home-loader");
  homeLoader.style.display = "block"; // show loader
  const student = await getLoggedInStudent();
  homeLoader.style.display = "none"; // hide loader
  if (!student) return;

  // Update name
  const nameEls = [
    document.getElementById("student-name"),
    document.getElementById("student-name-card"),
  ];
  nameEls.forEach(
    (el) =>
      el && (el.textContent = `${student.first_name} ${student.last_name}`)
  );

  // Update dashboard cards & mini progress bars
  const metrics = [
    { id: "student-level", value: student.level, max: 5 },
    { id: "student-points", value: student.points, max: 100 },
    { id: "attendance-week", value: student.attendance_week, max: 3 },
    { id: "attendance-month", value: student.attendance_month, max: 12 },
    { id: "projects-done", value: student.projects_done, max: 20 },
  ];

  metrics.forEach(({ id, value, max }) => {
    const cardEl = document.getElementById(id);
    if (cardEl) cardEl.textContent = value ?? 0;

    let barWrapper = cardEl?.nextElementSibling;
    if (!barWrapper || !barWrapper.classList.contains("card-progress-bar")) {
      barWrapper = document.createElement("div");
      barWrapper.className = "card-progress-bar";
      const fill = document.createElement("div");
      fill.className = "card-progress-fill";
      barWrapper.appendChild(fill);
      cardEl?.parentNode.appendChild(barWrapper);
    }

    const fill = barWrapper.querySelector(".card-progress-fill");
    const percent = Math.min((value / max) * 100, 100);
    fill.style.width = percent + "%";
  });

  // Upcoming sessions
  const upcomingEl = document.getElementById("upcoming-sessions-list");
  if (upcomingEl) {
    upcomingEl.innerHTML = "";
    const sessions =
      student.upcoming_sessions || student.upcomingSessions || [];

    if (sessions.length) {
      sessions.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = formatSession(s);
        upcomingEl.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No upcoming sessions";
      upcomingEl.appendChild(li);
    }
  }
  // this is just for testing
  // Charts
  const chartsData = [
    {
      id: "level-progress-chart",
      label: "Level",
      value: student.level,
      max: 5,
      color: "#1a9fff",
    },
    {
      id: "points-chart",
      label: "Points",
      value: student.points,
      max: 100,
      color: "#ff7f50",
    },
    {
      id: "attendance-chart",
      label: "Attendance (week)",
      value: student.attendance_week,
      max: 3,
      color: "#32cd32",
    },
    {
      id: "projects-chart",
      label: "Projects Done",
      value: student.projects_done,
      max: 20,
      color: "#ffa500",
    },
  ];

  chartsData.forEach(({ id, label, value, max, color }) => {
    const chartEl = document.getElementById(id);
    if (!chartEl) return;
    chartEl.innerHTML = "";
    chartEl.appendChild(createProgressBar(label, value, max, color));
  });
}

// ==============================
// Logout confirmation modal
// ==============================
export function initStudentLogout() {
  const logoutModal = document.getElementById("logout-modal");
  const cancelBtn = document.getElementById("logout-cancel-btn");
  const confirmBtn = document.getElementById("logout-confirm-btn");

  if (!logoutModal || !cancelBtn || !confirmBtn) return;

  // Function to open modal
  const openModal = () => {
    logoutModal.style.display = "flex";
  };

  // Cancel logout
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    logoutModal.style.display = "none";
    document.querySelector('[data-section="home"]')?.click();
  });

  // Confirm logout
  confirmBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      Session.clear();
      window.location.href = "login.html"; // adjust path if needed
    }
  });

  // Close modal if clicking outside
  logoutModal.addEventListener("click", (e) => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });

  // Optional: close modal with Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") logoutModal.style.display = "none";
  });

  // -------------------------
  // Sidebar logout link
  // -------------------------
  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const section = link.dataset.section;
      if (section !== "logout") return; // skip other links

      e.preventDefault();
      e.stopPropagation(); // prevent bubbling
      openModal();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetchAndRenderBadges();
  await fetchAndRenderCertificates();
  await updateDashboard();
  initStudentLogout();
});

// testing reasons
// ==============================
// Real-time student updates via socket
// ==============================
const socket = io(SOCKET_URL); // Adjust if deployed

document.addEventListener("DOMContentLoaded", async () => {
  const student = await getLoggedInStudent();
  if (!student) return;

  socket.emit("join_student", student.id);

  socket.on("student_updated", (data) => {
    console.log("📡 Live update received!", data);
    updateDashboard(); // refresh dashboard
  });
});

window.addEventListener("storage", () => updateDashboard());
