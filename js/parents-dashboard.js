// 1. Get logged-in parent
let parent = JSON.parse(localStorage.getItem("loggedInParent"));
if (!parent) {
  alert("No logged-in parent found. Please login first.");
  window.location.href = "login.html";
}

// 2. Verify role
if (parent.role !== "parent") {
  alert("Access denied. Only parents can view this page.");
  window.location.href = "login.html";
}

// 3. UI Elements
const parentNameEls = [
  document.getElementById("parent-name"),
  document.getElementById("parent-name-card"),
];
const avatarEl = document.getElementById("parent-avatar");
const childrenListEl = document.getElementById("children-list");

// 4. Render parent info
function renderParent() {
  parentNameEls.forEach((el) => (el.textContent = parent.username));
  if (parent.avatar) avatarEl.src = parent.avatar;
}

// 5. Render all children (updated with charts)
function renderChildren() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const childIds = parent.childIds || (parent.childId ? [parent.childId] : []);

  childrenListEl.innerHTML = "";

  if (!childIds.length) {
    childrenListEl.innerHTML = `<p>No children registered yet.</p>`;
    return;
  }

  const children = childIds
    .map((id) => users.find((u) => u.id === id && u.role === "student"))
    .filter(Boolean)
    .sort((a, b) => a.username.localeCompare(b.username));

  children.forEach((child, index) => {
    const container = document.createElement("div");
    container.className = "child-container";

    // Create upcoming sessions HTML
    let sessionsHTML = `<ul class="upcoming-sessions">`;
    if (child.upcomingSessions?.length) {
      child.upcomingSessions.forEach((s) => {
        const dateStr = s.date ? `${s.date} - ` : "";
        const timeStr = s.time ? `${s.time} - ` : "";
        const topicStr = s.topic || "No topic";
        sessionsHTML += `<li>${dateStr}${timeStr}${topicStr}</li>`;
      });
    } else {
      sessionsHTML += `<li>No upcoming sessions</li>`;
    }
    sessionsHTML += `</ul>`;

    // Child card HTML
    container.innerHTML = `
      <h4>${child.username || "Unnamed Child"}</h4>
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

      <div class="child-charts">
        <canvas id="child-chart-${index}" width="400" height="200"></canvas>
      </div>

      <div class="child-sessions">
        <h2>Upcoming Sessions</h2>
        ${sessionsHTML}
      </div>
    `;

    childrenListEl.appendChild(container);

    // Create chart
    const ctx = document
      .getElementById(`child-chart-${index}`)
      .getContext("2d");
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
            label: `${child.username}'s Stats`,
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
          title: { display: true, text: `${child.username}'s Stats Overview` },
        },
        scales: { y: { beginAtZero: true } },
      },
    });
  });
}

// 6. Initial render
renderParent();
renderChildren();

// 7. Reactivity: listen to changes in localStorage
window.addEventListener("storage", (event) => {
  if (event.key === "users" || event.key === "loggedInParent") {
    parent = JSON.parse(localStorage.getItem("loggedInParent")) || parent;
    renderParent();
    renderChildren();
  }
});

// 8. Sidebar navigation
document.querySelectorAll(".sidebar-nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const section = link.dataset.section;

    document.querySelectorAll(".dashboard-section").forEach((sec) => {
      sec.classList.remove("active");
    });

    const target = document.getElementById(`${section}-section`);
    if (target) target.classList.add("active");

    document
      .querySelectorAll(".sidebar-nav a")
      .forEach((a) => a.classList.remove("active"));
    link.classList.add("active");
  });
});

// -------------------------
// Parent Logout Modal Functionality
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.querySelector(
    '.sidebar-nav a[data-section="logout"]'
  );
  const logoutModal = document.getElementById("logout-modal");
  const cancelBtn = document.getElementById("logout-cancel-btn");
  const confirmBtn = document.getElementById("logout-confirm-btn");

  if (!logoutLink || !logoutModal || !cancelBtn || !confirmBtn) {
    console.error("Parent logout modal elements not found!");
    return;
  }

  // Open modal
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal.style.display = "flex";
  });

  // Cancel modal: hide modal AND switch back to home section
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

  // Confirm logout
  confirmBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInParent");
    window.location.href = "login.html";
  });

  // Close modal if clicked outside card
  window.addEventListener("click", (e) => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });
});
