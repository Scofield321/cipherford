import { updateDashboard } from "./student-dashboard.js";
import { fetchAndRenderLeaderboard } from "./student-leaderboard.js";
import { fetchAndRenderBadges } from "./student-badges.js";
import { fetchAndRenderCertificates } from "./student-certificates.js";
import { fetchAndRenderResources } from "./student-resources.js";

const mainContent = document.getElementById("main-content");

// Init home section
window.addEventListener("DOMContentLoaded", async () => {
  if (typeof updateDashboard === "function") await updateDashboard();
});

// Sidebar navigation
document.addEventListener("click", async (e) => {
  if (!e.target.matches(".sidebar-nav a")) return;
  e.preventDefault();

  const section = e.target.dataset.section;
  // Highlight active
  document
    .querySelectorAll(".sidebar-nav a")
    .forEach((link) => link.classList.remove("active"));
  e.target.classList.add("active");

  // Hide all sections
  document
    .querySelectorAll(".dashboard-section")
    .forEach((sec) => sec.classList.remove("active"));

  // Show selected
  if (section === "home")
    document.getElementById("home-section").classList.add("active");

  if (section === "leaderboard") {
    document.getElementById("leaderboard-section").classList.add("active");

    // Dynamically load leaderboard script only if not loaded
    if (!document.getElementById("leaderboard-script")) {
      const script = document.createElement("script");
      script.src = "./student-leaderboard.js";
      script.id = "leaderboard-script";
      script.type = "module";
      document.body.appendChild(script);

      script.onload = async () => {
        if (typeof fetchAndRenderLeaderboard === "function")
          await fetchAndRenderLeaderboard();
      };
    } else {
      await fetchAndRenderLeaderboard();
    }
  }
  if (section === "badges") {
    document.getElementById("badges-section").classList.add("active");

    if (!document.getElementById("badges-script")) {
      const script = document.createElement("script");
      script.src = "./student-badges.js";
      script.id = "badges-script";
      script.type = "module";
      document.body.appendChild(script);

      script.onload = async () => {
        if (typeof fetchAndRenderBadges === "function")
          await fetchAndRenderBadges();
      };
    } else {
      await fetchAndRenderBadges();
    }
  }
  if (section === "certificates") {
    document.getElementById("certificates-section").classList.add("active");

    if (!document.getElementById("certificates-script")) {
      const script = document.createElement("script");
      script.src = "./student-certificates.js";
      script.id = "certificates-script";
      script.type = "module";
      document.body.appendChild(script);

      script.onload = async () => {
        if (typeof fetchAndRenderCertificates === "function")
          await fetchAndRenderCertificates();
      };
    } else {
      await fetchAndRenderCertificates();
    }
  }
  if (section === "resources") {
    document.getElementById("resources-section").classList.add("active");

    if (!document.getElementById("resources-script")) {
      const script = document.createElement("script");
      script.src = "./student-resources.js";
      script.id = "resources-script";
      script.type = "module";
      document.body.appendChild(script);

      script.onload = async () => {
        if (typeof fetchAndRenderResources === "function")
          await fetchAndRenderResources();
      };
    } else {
      await fetchAndRenderResources();
    }
  }

  // Logout
  if (section === "logout") {
    localStorage.removeItem("loggedInStudent");
    window.location.href = "/login.html";
  }
});
