// student-certificates.js
import { Session } from "./session.js";
import { BASE_URL, SOCKET_URL } from "./config.js";
export async function fetchAndRenderCertificates() {
  const token = Session.token();
  const student = Session.user();
  const loader = document.getElementById("certificates-loader");
  loader.style.display = "block";
  const tableBody = document.querySelector("#certificates-table tbody");

  try {
    const res = await fetch(`${BASE_URL}/certificates/${student.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const certificates = await res.json();
    loader.style.display = "none";
    if (!certificates.length) {
      tableBody.innerHTML =
        "<tr><td colspan='4'>No certificates yet.</td></tr>";
      return;
    }
    // Render table rows
    tableBody.innerHTML = certificates
      .map(
        (cert, index) => `
      <tr>
      <td>${index + 1}</td>
        <td>${cert.title}</td>
        <td>${cert.description}</td>
        <td>
          <img class="certificate-clickable" 
               src="https://cdn-icons-png.flaticon.com/512/337/337946.png"
               alt="${cert.title}" 
               data-url="${cert.file_url}"
               style="width: 40px; height: 40px; cursor: pointer;" />
        </td>
        <td>${new Date(cert.issued_at).toLocaleString()}</td>
      </tr>
    `
      )
      .join("");

    // Modal logic
    const modal = document.getElementById("certificate-modal");
    const modalFrame = document.getElementById("certificate-modal-frame");
    const downloadBtn = document.getElementById("certificate-modal-download");
    const closeBtn = document.getElementById("certificate-modal-close");

    document.querySelectorAll(".certificate-clickable").forEach((icon) => {
      icon.addEventListener("click", () => {
        const fileUrl = icon.dataset.url;
        modalFrame.src = fileUrl;

        // Extract filename
        const filename = fileUrl.split("/").pop();

        // Forced download route
        downloadBtn.href = `${SOCKET_URL}/uploads/certificates/${filename}/download`;
        downloadBtn.download = `${icon.alt}.pdf`;

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
    console.error("Certificate loading error:", err);
    loader.style.display = "none";
    tableBody.innerHTML =
      "<tr><td colspan='5'>Failed to load certificates.</td></tr>";
  }
}
