import { updateDashboard } from "./student-dashboard.js";
import { fetchAndRenderLeaderboard } from "./student-leaderboard.js";
import { fetchAndRenderBadges } from "./student-badges.js";
import { fetchAndRenderCertificates } from "./student-certificates.js";
import { fetchAndRenderResources } from "./student-resources.js";
import { loadStudentCommunity } from "./student-community-router.js";

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const logoutModal = document.getElementById("logout-modal");
  const cancelBtn = document.getElementById("logout-cancel-btn");
  const confirmBtn = document.getElementById("logout-confirm-btn");

  if (!menuBtn || !sidebar) {
    console.warn("Sidebar/menu elements missing from DOM.");
    return;
  }

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.add("active");
    menuBtn.style.display = "none";
  });

  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      sidebar.classList.remove("active");
      menuBtn.style.display = "block";

      if (section === "logout") {
        if (logoutModal) logoutModal.style.display = "flex";
        return;
      }

      // 🔥 Hide community section when leaving it
      const communitySection = document.getElementById("community-section");
      if (communitySection && section !== "community") {
        communitySection.style.display = "none";
        communitySection.classList.remove("active");
      }

      document
        .querySelectorAll(".sidebar-nav a")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      document
        .querySelectorAll(".dashboard-section")
        .forEach((sec) => sec.classList.remove("active"));

      const sectionEl = document.getElementById(`${section}-section`);
      if (sectionEl) sectionEl.classList.add("active");

      // Load section content dynamically
      switch (section) {
        case "home":
          if (typeof updateDashboard === "function") await updateDashboard();
          break;
        case "leaderboard":
          if (typeof fetchAndRenderLeaderboard === "function")
            await fetchAndRenderLeaderboard();
          break;
        case "badges":
          if (typeof fetchAndRenderBadges === "function")
            await fetchAndRenderBadges();
          break;
        case "certificates":
          if (typeof fetchAndRenderCertificates === "function")
            await fetchAndRenderCertificates();
          break;
        case "resources":
          if (typeof fetchAndRenderResources === "function")
            await fetchAndRenderResources();
          break;
        case "community":
          if (typeof loadStudentCommunity === "function") {
            await loadStudentCommunity();

            // Optional: auto-click the first community tab
            const communitySection =
              document.getElementById("community-section");
            const firstTab = communitySection?.querySelector(".tab-link");
            if (firstTab) firstTab.click();
          }
          break;
      }
    });
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (logoutModal) logoutModal.style.display = "none";
      const homeLink = document.querySelector('[data-section="home"]');
      if (homeLink) homeLink.click();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedInStudent");
      window.location.href = "login.html";
    });
  }

  window.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("active") &&
      !sidebar.contains(e.target) &&
      e.target !== menuBtn
    ) {
      sidebar.classList.remove("active");
      menuBtn.style.display = "block";
    }

    if (e.target === logoutModal) {
      logoutModal.style.display = "none";
    }
  });

  // Automatically load home section on first load
  const homeLink = document.querySelector('[data-section="home"]');
  if (homeLink) homeLink.click();
});
