// student-resources.js
import { Session } from "./session.js";
import { BASE_URL, SOCKET_URL } from "./config.js";
export async function fetchAndRenderResources() {
  const token = Session.token();
  const student = Session.user();
  const loader = document.getElementById("resources-loader");
  loader.style.display = "block";
  const tbody = document.querySelector("#resources-table tbody");

  if (!tbody) return;

  try {
    const res = await fetch(`${BASE_URL}/resources/${student.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const resources = await res.json();
    loader.style.display = "none";
    if (!resources.length) {
      tbody.innerHTML = `<tr><td colspan="3">No resources available.</td></tr>`;
      return;
    }

    tbody.innerHTML = resources
      .map(
        (res, index) => `
      <tr>
      <td>${index + 1}</td>
        <td>${res.resource_name}</td>
        <td>
          <img class="resource-clickable"
            src="https://cdn-icons-png.flaticon.com/512/337/337946.png"
            alt="${res.resource_name}"
            data-url="${res.file_url}"
            style="width:40px;height:40px;cursor:pointer;" />
        </td>
        <td>${new Date(res.issued_at).toLocaleDateString()}</td>
      </tr>
    `
      )
      .join("");

    // Modal logic
    const modal = document.getElementById("resource-modal");
    const modalFrame = document.getElementById("resource-modal-frame");
    const downloadBtn = document.getElementById("resource-modal-download");
    const closeBtn = document.getElementById("resource-modal-close");

    document.querySelectorAll(".resource-clickable").forEach((icon) => {
      icon.addEventListener("click", () => {
        const fileUrl = icon.dataset.url;
        const filename = fileUrl.split("/").pop(); // get filename from URL
        const downloadUrl = `${SOCKET_URL}/uploads/resources/${filename}/download`;

        modalFrame.src = fileUrl; // preview stays normal
        downloadBtn.href = downloadUrl; // force download
        downloadBtn.download = filename;
        modal.style.display = "flex";
      });
    });

    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      modalFrame.src = "";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        modalFrame.src = "";
      }
    });
  } catch (err) {
    console.error("Resource loading error:", err);
    loader.style.display = "none";
    tbody.innerHTML = `<tr><td colspan="4">Failed to load resources.</td></tr>`;
  }
}
