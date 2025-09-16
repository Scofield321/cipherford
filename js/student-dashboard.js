// ======== Get student data =========
function getLoggedInStudent() {
  return JSON.parse(localStorage.getItem("loggedInStudent")) || null;
}

// ======== Create a progress bar =========
function createProgressBar(label, value, max) {
  const wrapper = document.createElement("div");
  wrapper.className = "progress-bar-wrapper";

  const title = document.createElement("span");
  title.textContent = `${label}: ${value} / ${max}`;
  title.className = "progress-title";

  const bar = document.createElement("div");
  bar.className = "progress-bar";

  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = "0%"; // start at 0% for animation

  // Animate percentage
  setTimeout(() => {
    const percent = Math.min((value / max) * 100, 100);
    fill.style.width = percent + "%";
    percentLabel.textContent = Math.round(percent) + "%";
  }, 50);

  bar.appendChild(fill);
  wrapper.appendChild(title);
  wrapper.appendChild(bar);

  // Animate the fill
  setTimeout(() => {
    const percent = Math.min((value / max) * 100, 100);
    fill.style.width = percent + "%";
  }, 50);

  return wrapper;
}

// ======== Update dashboard =========
function updateDashboard() {
  const student = getLoggedInStudent();
  if (!student) return;

  // Update names and avatar
  const nameEls = [
    document.getElementById("student-name"),
    document.getElementById("student-name-card"),
  ];
  nameEls.forEach((el) => (el.textContent = student.username));

  const avatarEl = document.getElementById("student-avatar");
  if (student.avatar) avatarEl.src = student.avatar;

  // Dashboard cards numbers
  const metrics = [
    { id: "student-level", value: student.level, max: 5 },
    { id: "student-points", value: student.points, max: 100 },
    { id: "attendance-week", value: student.attendanceWeek, max: 3 },
    { id: "projects-done", value: student.projectsDone, max: 20 },
  ];

  metrics.forEach(({ id, value, max }) => {
    const cardEl = document.getElementById(id);
    cardEl.textContent = value;

    // Add or update mini progress bar
    let barWrapper = cardEl.nextElementSibling;
    if (!barWrapper || !barWrapper.classList.contains("card-progress-bar")) {
      barWrapper = document.createElement("div");
      barWrapper.className = "card-progress-bar";
      const fill = document.createElement("div");
      fill.className = "card-progress-fill";
      barWrapper.appendChild(fill);
      cardEl.parentNode.appendChild(barWrapper);
    }

    const fill = barWrapper.querySelector(".card-progress-fill");
    const percent = Math.min((value / max) * 100, 100);
    fill.style.width = percent + "%";
  });

  // Upcoming sessions
  const upcomingEl = document.getElementById("upcoming-sessions-list");
  upcomingEl.innerHTML = "";
  if (student.upcomingSessions?.length) {
    student.upcomingSessions.forEach((s) => {
      const li = document.createElement("li");
      const dateStr = s.date ? `${s.date} - ` : "";
      const timeStr = s.time ? `${s.time} - ` : "";
      const topicStr = s.topic || "No topic";
      li.textContent = `${dateStr}${timeStr}${topicStr}`;
      upcomingEl.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No upcoming sessions";
    upcomingEl.appendChild(li);
  }

  // Charts
  const charts = [
    {
      id: "level-progress-chart",
      label: "Points",
      value: student.points,
      max: 100,
      color: "linear-gradient(90deg, #1a9fff, #00ffd5)",
    },
    {
      id: "attendance-chart",
      label: "Attendance (week)",
      value: student.attendanceWeek,
      max: 3,
      color: "linear-gradient(90deg, #ff6f61, #ffca3a)",
    },
    {
      id: "projects-chart",
      label: "Projects Completed",
      value: student.projectsDone,
      max: 20,
      color: "linear-gradient(90deg, #8ac926, #1982c4)",
    },
  ];

  charts.forEach(({ id, label, value, max, color }) => {
    const chartEl = document.getElementById(id);
    chartEl.innerHTML = "";
    const barWrapper = createProgressBar(label, value, max);
    const fill = barWrapper.querySelector(".progress-fill");
    fill.style.background = color; // set color per chart
    chartEl.appendChild(barWrapper);
  });
}

// ======== Listen for localStorage changes =========
window.addEventListener("storage", (e) => {
  if (e.key === "loggedInStudent" || e.key === "users") {
    const loggedInStudent = getLoggedInStudent();
    if (!loggedInStudent) return;

    // Update loggedInStudent from the latest users array if Admin changed it
    if (e.key === "users") {
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const updatedStudent = users.find(
        (u) => u.email === loggedInStudent.email
      );
      if (updatedStudent) {
        localStorage.setItem("loggedInStudent", JSON.stringify(updatedStudent));
      }
    }

    updateDashboard();
  }
});

// ======== Initial load =========
updateDashboard();

// -------------------------
// Student Logout Modal
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.querySelector(
    '.sidebar-nav a[data-section="logout"]'
  );
  const logoutModal = document.getElementById("logout-modal");
  const cancelBtn = document.getElementById("logout-cancel-btn");
  const confirmBtn = document.getElementById("logout-confirm-btn");

  if (!logoutLink || !logoutModal || !cancelBtn || !confirmBtn) {
    console.error("Student logout modal elements not found!");
    return;
  }

  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal.style.display = "flex";
  });

  cancelBtn.addEventListener("click", () => {
    logoutModal.style.display = "none";

    const homeSection = document.getElementById("home-section");
    const settingsSection = document.getElementById("settings-section");

    if (homeSection && settingsSection) {
      homeSection.classList.add("active");
      settingsSection.classList.remove("active");
    }

    document
      .querySelectorAll(".sidebar-nav a")
      .forEach((link) => link.classList.remove("active"));
    const homeLink = document.querySelector(
      '.sidebar-nav a[data-section="home"]'
    );
    if (homeLink) homeLink.classList.add("active");
  });

  confirmBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInStudent");
    window.location.href = "login.html";
  });

  window.addEventListener("click", (e) => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });
});
