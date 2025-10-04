import { BASE_URL } from "./config.js";
// ---------- Main Content ----------
const mainContent = document.getElementById("main-content");
// ---------- Initialize dashboard ----------
window.addEventListener("DOMContentLoaded", async () => {
  if (typeof initParentDashboard === "function") await initParentDashboard();

  // Load settings script dynamically
  if (!document.getElementById("parent-settings-script")) {
    const script = document.createElement("script");
    script.src = "/parent-settings.js";
    script.id = "parent-settings-script";
    document.body.appendChild(script);

    script.onload = async () => {
      if (typeof initParentSettings === "function") await initParentSettings();
    };
  }
});
// this is just for testing
// ---------- Sidebar navigation ----------
document.addEventListener("click", async (e) => {
  if (!e.target.matches(".sidebar-nav a")) return;

  e.preventDefault();
  const section = e.target.dataset.section;

  // Update active link
  document
    .querySelectorAll(".sidebar-nav a")
    .forEach((link) => link.classList.remove("active"));
  e.target.classList.add("active");

  // Show/Hide sections
  document
    .querySelectorAll(".dashboard-section")
    .forEach((sec) => sec.classList.remove("active"));
  if (section === "home")
    document.getElementById("home-section")?.classList.add("active");
  if (section === "settings")
    document.getElementById("settings-section")?.classList.add("active");

  // Logout via API
  if (section === "logout") {
    try {
      await fetch(`api/logout`, { method: "POST" });
    } catch (err) {
      console.error("Logout failed", err);
    }
    window.location.href = "/login.html";
  }
});
