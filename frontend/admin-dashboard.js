import { Session } from "./session.js";
import { BASE_URL } from "./config.js";
// ======== Render Admin Info ========
function renderAdminInfo() {
  const admin = Session.user();
  if (!admin) return (window.location.href = "login.html");

  const nameEl = document.getElementById("admin-name");
  if (nameEl) nameEl.textContent = `${admin.first_name} ${admin.last_name}`;
}

// ======== Fetch Dashboard Stats from Backend ========
async function fetchDashboardStats() {
  const loader = document.getElementById("home-loader");
  loader.style.display = "block"; // show loader
  try {
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    loader.style.display = "none"; // hide loader
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
    return await res.json();
  } catch (err) {
    console.error(err);
    loader.style.display = "none";
    await Swal.fire({
      icon: "error",
      title: "Session Expired",
      text: "Session expired or stats error. Please login again.",
      confirmButtonColor: "#1a9fff",
    });
    Session.clear();
    window.location.href = "login.html";
  } finally {
    loader.style.display = "none"; // hide loader no matter what
  }
}
// this is just for testing
// ======== Set Text Helper ========
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ======== Initialize Charts Safely ========
function initChart(canvasId, type, data, options, chartStoreName) {
  const container = document.getElementById(canvasId)?.parentElement;
  if (!container) return null;

  const oldCanvas = document.getElementById(canvasId);
  if (oldCanvas) oldCanvas.remove();

  const newCanvas = document.createElement("canvas");
  newCanvas.id = canvasId;
  container.appendChild(newCanvas);

  if (window[chartStoreName]) {
    try {
      window[chartStoreName].destroy();
    } catch (e) {
      console.warn(`Failed to destroy chart ${chartStoreName}:`, e.message);
    }
  }

  window[chartStoreName] = new Chart(newCanvas.getContext("2d"), {
    type,
    data,
    options,
  });
}

// ======== Initialize Admin Dashboard ========
export async function initAdminDashboard() {
  renderAdminInfo();

  const stats = await fetchDashboardStats();
  if (!stats) return;

  setText("total-students", stats.totalStudents);
  setText("total-parents", stats.totalParents);
  setText("monthly-signups", stats.monthlySignups);
  setText("upcoming-sessions", stats.upcomingSessions);

  // === Plan Distribution Chart ===
  const planCounts = stats.planDistribution || {};
  initChart(
    "planChart",
    "doughnut",
    {
      labels: Object.keys(planCounts),
      datasets: [
        {
          data: Object.values(planCounts),
          backgroundColor: [
            "#1a9fff",
            "#ff6f61",
            "#ffca3a",
            "#8ac926",
            "#1982c4",
            "#6a4c93",
          ],
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: true, // ensures perfect circle
      plugins: {
        legend: { position: "bottom", labels: { color: "#fff" } },
        title: {
          display: true,
          text: "Plan Distribution",
          color: "#fff",
          font: { size: 16 },
        },
      },
    },
    "planChart"
  );

  // === New Signups Per Month Chart ===
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const signupCounts = months.map((m, i) => {
    const match = stats.monthlySignupData.find((d) => {
      const monthNumber = parseInt(d.month.split("-")[1], 10);
      return monthNumber === i + 1;
    });
    return match ? match.count : 0;
  });

  const container = document.getElementById(
    "monthlySignupsChart"
  )?.parentElement;
  if (container) {
    const oldCanvas = document.getElementById("monthlySignupsChart");
    if (oldCanvas) oldCanvas.remove();

    const newCanvas = document.createElement("canvas");
    newCanvas.id = "monthlySignupsChart";

    // Set height dynamically for mobile
    newCanvas.height = window.innerWidth <= 600 ? 300 : 200;

    container.appendChild(newCanvas);

    if (window.monthlySignupsChart) {
      try {
        window.monthlySignupsChart.destroy();
      } catch (e) {
        console.warn(
          "Failed to destroy previous monthlySignupsChart:",
          e.message
        );
      }
    }

    window.monthlySignupsChart = new Chart(newCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          {
            label: "Signups",
            data: signupCounts,
            backgroundColor: "#1a9fff",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "New Signups Per Month",
            color: "#fff",
          },
        },
        scales: {
          x: { ticks: { color: "#fff" } },
          y: { ticks: { color: "#fff" }, beginAtZero: true },
        },
      },
    });
  }
}

// Initialize dashboard on load
document.addEventListener("DOMContentLoaded", initAdminDashboard);
