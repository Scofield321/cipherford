import { Session } from "./session.js";

const mainContent = document.getElementById("main-content");

// -------------------------
// Helper to dynamically load a module script
// -------------------------
function loadModule(src, id) {
  return new Promise((resolve, reject) => {
    const oldScript = document.getElementById(id);
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.src = src + "?v=" + Date.now(); // cache busting
    script.id = id;
    script.type = "module";
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

// -------------------------
// Session check
// -------------------------
async function requireSession() {
  if (!Session.token()) {
    await Swal.fire({
      icon: "warning",
      title: "Session Expired",
      text: "Your session has expired. Please login again.",
      confirmButtonColor: "#1a9fff",
    });
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// -------------------------
// Load view and its script (flat structure)
// -------------------------
async function loadView(view) {
  if (!(await requireSession())) return;

  try {
    const res = await fetch(`${view}.html`);
    if (!res.ok) throw new Error(`Failed to load view: ${view}`);
    const html = await res.text();
    mainContent.innerHTML = html;

    // Load corresponding JS file (same folder)
    switch (view) {
      case "home-dashboard":
        import("./admin-dashboard.js").then((module) => {
          if (typeof module.initAdminDashboard === "function")
            module.initAdminDashboard();
        });
        break;

      case "manage-students":
        await loadModule("./manage-students.js", "manage-students-script");
        import("./manage-students.js").then((module) => {
          if (typeof module.initManageStudents === "function")
            module.initManageStudents(Session.token());
        });
        break;

      case "manage-parents":
        await loadModule("./manage-parents.js", "manage-parents-script");
        import("./manage-parents.js").then((module) => {
          if (typeof module.initManageParents === "function")
            module.initManageParents(Session.token());
        });
        break;

      case "track-students":
        await loadModule("./track-students.js", "track-students-script");
        import("./track-students.js").then((module) => {
          if (typeof module.initTrackStudents === "function")
            module.initTrackStudents(Session.token());
        });
        break;

      case "settings":
        await loadModule("./settings.js", "settings-script");
        import("./settings.js");
        break;

      default:
        console.warn(`No script defined for view: ${view}`);
    }
  } catch (err) {
    console.error(err);
    mainContent.innerHTML =
      "<p style='padding:20px;'>Failed to load content.</p>";
  }
}

// -------------------------
// Logout modal setup
// -------------------------
function setupLogoutModal() {
  const logoutLink = document.querySelector(
    '.dashboard-link[data-view="logout"]'
  );
  const logoutModal = document.getElementById("logout-modal");
  const cancelBtn = document.getElementById("logout-cancel-btn");
  const confirmBtn = document.getElementById("logout-confirm-btn");

  if (!logoutLink || !logoutModal || !cancelBtn || !confirmBtn) return;

  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal.style.display = "flex";
  });

  cancelBtn.addEventListener("click", () => {
    logoutModal.style.display = "none";
  });

  confirmBtn.addEventListener("click", () => {
    Session.clear();
    window.location.href = "login.html";
  });

  window.addEventListener("click", (e) => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });
}

// -------------------------
// Initialize dashboard
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadView("home-dashboard");
  setupLogoutModal();
});

// -------------------------
// Navigation handler
// -------------------------
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("dashboard-link")) {
    e.preventDefault();

    document
      .querySelectorAll(".dashboard-link")
      .forEach((link) => link.classList.remove("active"));
    e.target.classList.add("active");

    const view = e.target.getAttribute("data-view");
    loadView(view);
  }
});
