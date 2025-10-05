// student-badges.js
import { Session } from "./session.js";
import { BASE_URL, SOCKET_URL } from "./config.js";
export async function fetchAndRenderBadges() {
  const token = Session.token();
  const student = Session.user();
  const loader = document.getElementById("badges-loader");
  loader.style.display = "block";
  const tableBody = document.querySelector("#badges-table tbody");

  try {
    const res = await fetch(`${BASE_URL}/badges/${student.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const badges = await res.json();
    loader.style.display = "none"; // hide loader

    if (!badges.length) {
      tableBody.innerHTML = "<tr><td colspan='4'>No badges yet.</td></tr>";
      return;
    }

    // Render table rows with clickable images
    tableBody.innerHTML = badges
      .map(
        (badge, index) => `
        <tr>
        <td>${index + 1}</td>
          <td>${badge.title}</td>
          <td>${badge.description}</td>
          <td>
            <img class="badge-clickable" 
            src="https://cdn-icons-png.flaticon.com/512/337/337946.png" 
                 alt="${badge.title}" 
                 style="width: 40px; height: 40px; cursor: pointer;" />
          </td>
          <td>${new Date(badge.awarded_at).toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    // Modal elements
    const modal = document.getElementById("badge-modal");
    const modalFrame = document.getElementById("badge-modal-frame");
    const downloadBtn = document.getElementById("badge-modal-download");
    const closeBtn = document.getElementById("badge-modal-close");

    // Handle click on badge image
    document.querySelectorAll(".badge-clickable").forEach((icon) => {
      icon.addEventListener("click", () => {
        const fileUrl = icon.dataset.url;
        modalFrame.src = fileUrl;
        const filename = imgUrl.split("/").pop();

        // Set modal image
        modalImg.src = imgUrl;
        modalImg.alt = altText;

        // Set download button using the /download route
        downloadBtn.href = `${SOCKET_URL}/uploads/badges/${filename}/download`;
        downloadBtn.download = `${icon.alt}.pdf`;

        // Show modal
        modal.style.display = "flex";
      });
    });

    // Close modal on X click
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      modalFrame.src = "";
    });

    // Close modal on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        modalFrame.src = "";
      }
    });
  } catch (err) {
    console.error("Badge loading error:", err);
    loader.style.display = "none";
    tableBody.innerHTML =
      "<tr><td colspan='5'>Failed to load badges.</td></tr>";
  }
}
