const mainContent = document.getElementById("main-content");

// Initialize dashboard after DOM loads
window.addEventListener("DOMContentLoaded", () => {
  // Initialize parent dashboard
  if (typeof initParentDashboard === "function") {
    initParentDashboard();
  }

  // Load parent-settings.js once
  const script = document.createElement("script");
  script.src = "/js/parent-settings.js";
  script.id = "parent-settings-script";
  document.body.appendChild(script);

  script.onload = () => {
    if (typeof initParentSettings === "function") {
      initParentSettings(); // Attach event listener to password form
    }
  };
});

// Sidebar navigation
document.addEventListener("click", (e) => {
  if (e.target.matches(".sidebar-nav a")) {
    e.preventDefault();

    const section = e.target.getAttribute("data-section");

    // Update active link
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      link.classList.remove("active");
    });
    e.target.classList.add("active");

    // Show/Hide sections
    document.querySelectorAll(".dashboard-section").forEach((sec) => {
      sec.classList.remove("active");
    });

    if (section === "home") {
      document.getElementById("home-section").classList.add("active");
    } else if (section === "settings") {
      document.getElementById("settings-section").classList.add("active");
    } else if (section === "logout") {
      localStorage.removeItem("loggedInUser");
      window.location.href = "/login.html";
    }
  }
});
