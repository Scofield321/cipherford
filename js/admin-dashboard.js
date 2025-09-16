// Get the logged-in admin
const loggedInAdmin = JSON.parse(localStorage.getItem("loggedInAdmin"));

// ======== Render Admin Info ========
function renderAdminInfo() {
  const admin = JSON.parse(localStorage.getItem("loggedInAdmin"));
  if (!admin) return;

  const nameEl = document.getElementById("admin-name");
  if (nameEl) nameEl.textContent = admin.username;

  // Optional: if you add an avatar
  const avatarEl = document.querySelector(".admin-profile img");
  if (avatarEl && admin.avatar) avatarEl.src = admin.avatar;
}

// Call it on page load
renderAdminInfo();

// Update live if localStorage changes
window.addEventListener("storage", (event) => {
  if (event.key === "loggedInAdmin") renderAdminInfo();
});

// Redirect to login if not logged in
if (!loggedInAdmin) {
  window.location.href = "login.html";
}

// Initialize Admin Dashboard
function initAdminDashboard() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const students = users.filter((u) => u.role === "student");
  const parents = users.filter((u) => u.role === "parent");

  // -------------------------
  // Basic Stats
  // -------------------------
  if (document.getElementById("total-students"))
    document.getElementById("total-students").textContent = students.length;
  if (document.getElementById("total-parents"))
    document.getElementById("total-parents").textContent = parents.length;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlySignups = users.filter((u) => {
    const created = new Date(u.createdAt || now);
    return (
      created.getMonth() === currentMonth &&
      created.getFullYear() === currentYear
    );
  }).length;

  if (document.getElementById("monthly-signups"))
    document.getElementById("monthly-signups").textContent = monthlySignups;

  const upcomingSessionsCount = students.reduce(
    (acc, s) => acc + (s.upcomingSessions?.length || 0),
    0
  );
  if (document.getElementById("upcoming-sessions"))
    document.getElementById("upcoming-sessions").textContent =
      upcomingSessionsCount;

  const attendedSessions = students.reduce(
    (acc, s) => acc + (s.attendanceWeek || 0),
    0
  );
  if (document.getElementById("attended-sessions"))
    document.getElementById("attended-sessions").textContent = attendedSessions;

  const avgProgress =
    students.length > 0
      ? Math.round(
          students.reduce((acc, s) => acc + (s.points || 0), 0) /
            students.length
        )
      : 0;
  if (document.getElementById("avg-progress"))
    document.getElementById("avg-progress").textContent = `${avgProgress}%`;

  const assignmentsSubmitted = students.reduce(
    (acc, s) => acc + (s.projectsDone || 0),
    0
  );
  if (document.getElementById("assignments-submitted"))
    document.getElementById("assignments-submitted").textContent =
      assignmentsSubmitted;

  // -------------------------
  // Plan Distribution Chart
  // -------------------------
  const planDistributionEl = document.getElementById("plan-distribution");
  if (planDistributionEl) {
    const planCounts = students.reduce((acc, s) => {
      const plan = s.plan || "Free";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});
    const planLabels = Object.keys(planCounts);
    const planData = Object.values(planCounts);

    planDistributionEl.innerHTML = '<canvas id="planChart"></canvas>';
    new Chart(document.getElementById("planChart").getContext("2d"), {
      type: "doughnut",
      data: {
        labels: planLabels,
        datasets: [
          {
            data: planData,
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
      options: {
        responsive: true,
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
    });
  }

  // -------------------------
  // Weekly Attendance Trend
  // -------------------------
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const weeklyAttendance = weeks.map((_, i) =>
    students.reduce((acc, s) => acc + (s.attendanceHistory?.[i] || 0), 0)
  );

  const attendanceContainer = document.getElementById("weekly-attendance");
  if (attendanceContainer) {
    attendanceContainer.innerHTML = '<canvas id="attendanceChart"></canvas>';
    new Chart(document.getElementById("attendanceChart").getContext("2d"), {
      type: "line",
      data: {
        labels: weeks,
        datasets: [
          {
            label: "Total Attendance",
            data: weeklyAttendance,
            borderColor: "#1a9fff",
            backgroundColor: "rgba(26,159,255,0.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "#fff" } },
          title: {
            display: true,
            text: "Weekly Attendance Trend",
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

  // -------------------------
  // Average Progress per Week (Bar Chart)
  // -------------------------
  const progressContainer = document.getElementById("weekly-progress");
  if (progressContainer) {
    progressContainer.innerHTML = '<canvas id="progressChart"></canvas>';
    const avgProgressPerWeek = weeks.map((_, i) =>
      Math.round(
        students.reduce((acc, s) => acc + (s.weeklyPoints?.[i] || 0), 0) /
          (students.length || 1)
      )
    );
    new Chart(document.getElementById("progressChart").getContext("2d"), {
      type: "bar",
      data: {
        labels: weeks,
        datasets: [
          {
            label: "Avg Progress",
            data: avgProgressPerWeek,
            backgroundColor: "#ffca3a",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "#fff" } },
          title: {
            display: true,
            text: "Average Progress per Week",
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

// -------------------------
// Logout Modal Functionality
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.querySelector(
    '.dashboard-link[data-view="logout"]'
  );
  const logoutModal = document.getElementById("logout-modal");
  const cancelBtn = document.getElementById("logout-cancel-btn");
  const confirmBtn = document.getElementById("logout-confirm-btn");

  if (!logoutLink || !logoutModal || !cancelBtn || !confirmBtn) return;

  // Open modal
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal.style.display = "flex";
  });

  // Cancel modal
  cancelBtn.addEventListener("click", () => {
    logoutModal.style.display = "none";
    const dashboardLink = document.querySelector(
      '.dashboard-link[data-view="home-dashboard"]'
    );
    if (dashboardLink) dashboardLink.click();
  });

  // Confirm logout (remove only admin session)
  confirmBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInAdmin");
    window.location.href = "login.html";
  });

  // Close modal if clicked outside card
  window.addEventListener("click", (e) => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });
});

// Reactivity for live updates
window.addEventListener("storage", (event) => {
  if (event.key === "users") initAdminDashboard();
});

// Initialize dashboard on load
document.addEventListener("DOMContentLoaded", initAdminDashboard);
