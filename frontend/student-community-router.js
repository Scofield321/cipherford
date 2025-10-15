import { initStudentCommunity } from "./student-community.js";

export async function loadStudentCommunity() {
  console.log("Student community router initialized...");

  let container = document.getElementById("community-section");
  const mainContent = document.getElementById("main-dashboard-content");

  if (!container) {
    if (!mainContent) {
      console.error("Main dashboard container not found!");
      return;
    }
    container = document.createElement("section");
    container.id = "community-section";
    container.classList.add("dashboard-section");
    mainContent.appendChild(container);
  }

  container.innerHTML = `<div id="community-loader" class="loader"></div>`;
  container.style.display = "block"; // show section

  try {
    const res = await fetch("./student-community.html");
    if (!res.ok) throw new Error("Failed to load student community HTML");
    const html = await res.text();
    container.innerHTML = html;

    // Hide all other dashboard sections
    document
      .querySelectorAll(".dashboard-section")
      .forEach((sec) => sec.classList.remove("active"));
    // Show community section
    container.classList.add("active");
    // Initialize community JS (buttons, modals, etc.)
    await initStudentCommunity();
    // TAB SWITCHING LOGIC
    const tabLinks = container.querySelectorAll(".tab-link");
    const tabs = container.querySelectorAll(".community-tab");
    tabLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        tabLinks.forEach((l) => l.classList.remove("active"));
        tabs.forEach((t) => t.classList.remove("active"));

        link.classList.add("active");
        const tabId = `community-${link.dataset.tab}`;
        const activeTab = container.querySelector(`#${tabId}`);
        if (activeTab) activeTab.classList.add("active");
      });
    });

    console.log("Student community loaded successfully.");
  } catch (err) {
    console.error("Error loading student community:", err);
    container.innerHTML = `
      <p style="color:red; text-align:center; padding:1rem;">
        Failed to load the community section. Please try again later.
      </p>
    `;
    container.classList.add("active");
  }
}
