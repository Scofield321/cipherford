const mainContent = document.getElementById("main-content");

// Helper to dynamically load a JS file
function loadScript(src, id, callback) {
  // Remove old script if exists
  const oldScript = document.getElementById(id);
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.src = src + "?v=" + Date.now(); // Avoid caching
  script.id = id;
  script.onload = callback; // optional callback when loaded
  document.body.appendChild(script);
}

// Load a view (HTML + optional script)
function loadView(view) {
  fetch(`/views/${view}.html`)
    .then((res) => res.text())
    .then((html) => {
      mainContent.innerHTML = html;

      // Run view-specific initialization
      switch (view) {
        case "home-dashboard":
          if (typeof initAdminDashboard === "function") initAdminDashboard();
          break;

        case "manage-students":
          loadScript("/js/manage-students.js", "manage-students-script", () => {
            if (typeof initManageStudents === "function") {
              console.log("✅ initManageStudents() called from router");
              initManageStudents();
            } else {
              console.warn("⚠️ initManageStudents() not found");
            }
          });
          break;

        case "manage-parents":
          loadScript("/js/manage-parents.js", "manage-parents-script", () => {
            if (typeof loadParentsTable === "function") loadParentsTable();
          });
          break;

        case "track-students":
          loadScript("/js/track-students.js", "track-students-script", () => {
            if (typeof initTrackStudents === "function") initTrackStudents();
          });
          break;

        case "settings":
          loadScript("/js/settings.js", "settings-script", () => {
            console.log("✅ settings.js loaded for settings view");
          });
          break;

        // Add more views here as needed
      }
    })
    .catch((err) => {
      console.error("Failed to load view:", view, err);
      mainContent.innerHTML =
        "<p style='padding:20px;'>Failed to load content.</p>";
    });
}

// Load default view on first load
window.addEventListener("DOMContentLoaded", () => {
  loadView("home-dashboard");
});

// Navigation handler
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("dashboard-link")) {
    e.preventDefault();

    // Active link styling
    document.querySelectorAll(".dashboard-link").forEach((link) => {
      link.classList.remove("active");
    });
    e.target.classList.add("active");

    const view = e.target.getAttribute("data-view");
    loadView(view);
  }
});
