import { io } from "https://cdn.socket.io/4.5.4/socket.io.esm.min.js";
import { Session } from "./session.js";
import { BASE_URL, SOCKET_URL } from "./config.js";
// ==============================
// Get JWT token safely
// ==============================
const token = Session.token();

if (!token) {
  console.error("No JWT token found, redirecting to login");
  window.location.href = "login.html";
}

// ==============================
// Fetch logged-in parent
// ==============================
async function getLoggedInParent() {
  try {
    const res = await fetch(`${BASE_URL}/users/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Failed to fetch parent info:", errorText);
      throw new Error("Not logged in or session expired");
    }

    const parent = await res.json();
    if (parent.role !== "parent") throw new Error("Access denied");
    return parent;
  } catch (err) {
    console.error("Error in getLoggedInParent:", err.message);
    await Swal.fire({
      icon: "error",
      title: "Error",
      text: err.message,
      confirmButtonColor: "#ff4d4f",
    });
    window.location.href = "login.html";
    return null;
  }
}
// this is just for testing
// ==============================
// Render parent info
// ==============================
function renderParentInfo(parent) {
  const nameEls = [
    document.getElementById("parent-name"),
    document.getElementById("parent-name-card"),
  ];
  nameEls.forEach(
    (el) => el && (el.textContent = `${parent.first_name} ${parent.last_name}`)
  );

  const sessionEl = document.getElementById("parent-session-count");
  if (sessionEl) sessionEl.textContent = parent.session_count ?? 0;
}

// ==============================
// Render children cards & charts
// ==============================
function formatSession(session) {
  if (!session.date || !session.time) return "No session info";

  const dateObj = new Date(session.date);
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  const time = session.time.slice(0, 5); // '14:30:00' => '14:30'

  return `${day}/${month}/${year} ${time} - ${session.topic || "No Topic"}`;
}

// -------------------------
// Render children on parent dashboard
// -------------------------
function renderChildren(children) {
  const container = document.getElementById("children-list");
  if (!container) return;
  container.innerHTML = "";

  if (!children || children.length === 0) {
    container.innerHTML = `<p>No children registered yet.</p>`;
    return;
  }

  children.forEach((child, index) => {
    const childDiv = document.createElement("div");
    childDiv.className = "child-container";

    childDiv.innerHTML = `
      <h4>${child.first_name} ${child.last_name}</h4>
      <div class="child-cards">
        <div class="child-card">
          <h5>Progress</h5>
          <p>Level: ${child.level ?? 0}</p>
          <p>Points: ${child.points ?? 0}</p>
        </div>
        <div class="child-card">
          <h5>Attendance</h5>
          <p>Week: ${child.attendanceWeek ?? 0}</p>
          <p>Month: ${child.attendanceMonth ?? 0}</p>
        </div>
        <div class="child-card">
          <h5>Projects</h5>
          <p>Completed: ${child.projectsDone ?? 0}</p>
        </div>
      </div>

      <div class="child-sessions">
        <h5>Upcoming Sessions</h5>
        <ul class="upcoming-sessions">
          ${
            child.upcomingSessions?.length
              ? child.upcomingSessions
                  .map((s) => `<li>${formatSession(s)}</li>`)
                  .join("")
              : "<li>No upcoming sessions</li>"
          }
        </ul>
      </div>
    `;

    container.appendChild(childDiv);

    // Chart.js bar chart
    const chartCanvas = document.createElement("canvas");
    chartCanvas.id = `child-chart-${index}`;
    chartCanvas.width = 400;
    const chartHeight = window.innerWidth <= 600 ? 400 : 200;
    chartCanvas.height = chartHeight;

    childDiv.appendChild(chartCanvas);

    const ctx = chartCanvas.getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "Level",
          "Points",
          "Attendance (Week)",
          "Attendance (Month)",
          "Projects Done",
        ],
        datasets: [
          {
            label: `${child.first_name}'s Stats`,
            data: [
              child.level ?? 0,
              child.points ?? 0,
              child.attendanceWeek ?? 0,
              child.attendanceMonth ?? 0,
              child.projectsDone ?? 0,
            ],
            backgroundColor: [
              "#1a9fff",
              "#ff7f50",
              "#32cd32",
              "#ffa500",
              "#ff69b4",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `${child.first_name}'s Stats Overview`,
          },
        },
        scales: { y: { beginAtZero: true } },
      },
    });
  });
}

// ==============================
// Refresh parent info periodically
// ==============================
async function refreshParentInfo() {
  try {
    const parent = await getLoggedInParent();
    if (!parent) return;

    // Update parent session count only
    const sessionEl = document.getElementById("parent-session-count");
    if (sessionEl) sessionEl.textContent = parent.session_count ?? 0;

    // Update children sessions without re-rendering charts
    parent.children.forEach((child, index) => {
      const ul = document.querySelector(
        `#child-chart-${index}`
      )?.previousElementSibling;
      if (ul && child.upcomingSessions) {
        ul.innerHTML = child.upcomingSessions
          .map((s) => `<li>${formatSession(s)}</li>`)
          .join("");
      }
    });
  } catch (err) {
    console.error("Error refreshing parent info:", err.message);
  }
}

// ==============================
// Initialize dashboard
// ==============================
async function initParentDashboard() {
  const loader = document.getElementById("home-loader");
  loader.style.display = "block"; // show loader

  try {
    const parent = await getLoggedInParent();
    if (!parent) return;

    renderParentInfo(parent);
    renderChildren(parent.children);

    const socket = io(SOCKET_URL);

    parent.children.forEach((child) => {
      socket.emit("join_student", child.id); // Join each child's room
    });

    socket.on("student_updated", (updatedStudent) => {
      console.log("📡 Student update received:", updatedStudent);
      // Refresh the whole dashboard
      initParentDashboard();
    });

    // Refresh every 10 seconds as a fallback
    setInterval(refreshParentInfo, 10000);
  } catch (err) {
    console.error("Error initializing dashboard:", err);
  } finally {
    loader.style.display = "none"; // hide loader
  }
}

// ==============================
// Sidebar & Logout
// ==============================
document.addEventListener("click", (e) => {
  const target = e.target;
  if (!target.matches(".sidebar-nav a")) return;
  e.preventDefault();

  const section = target.dataset.section;
  document
    .querySelectorAll(".sidebar-nav a")
    .forEach((link) => link.classList.remove("active"));
  target.classList.add("active");

  document
    .querySelectorAll(".dashboard-section")
    .forEach((sec) => sec.classList.remove("active"));
  if (section === "home")
    document.getElementById("home-section")?.classList.add("active");
  else if (section === "settings")
    document.getElementById("settings-section")?.classList.add("active");
  else if (section === "logout") confirmLogout();
});

function confirmLogout() {
  const logoutModal = document.getElementById("logout-modal");
  const cancelBtn = document.getElementById("logout-cancel-btn");
  const confirmBtn = document.getElementById("logout-confirm-btn");
  if (!logoutModal || !cancelBtn || !confirmBtn) return;

  logoutModal.style.display = "flex";

  cancelBtn.onclick = () => {
    logoutModal.style.display = "none";
    document.querySelector('[data-section="home"]').click();
  };

  confirmBtn.onclick = async () => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
    } finally {
      Session.clear();
      window.location.href = "login.html";
    }
  };

  window.addEventListener("click", (e) => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });
}
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

// ==============================
// Init after DOM loaded
// ==============================
window.addEventListener("DOMContentLoaded", initParentDashboard);
