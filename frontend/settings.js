import { Session } from "./session.js";
import { BASE_URL } from "./config.js";
// ==============================
// Show feedback messages
// ==============================
function showMessage(message, type = "info") {
  const existing = document.getElementById("settings-msg");
  if (existing) existing.remove();

  const msg = document.createElement("div");
  msg.id = "settings-msg";
  msg.textContent = message;
  msg.style.marginTop = "15px";
  msg.style.padding = "10px";
  msg.style.borderRadius = "6px";
  msg.style.fontWeight = "bold";
  msg.style.backgroundColor =
    type === "success" ? "#d4edda" : type === "error" ? "#f8d7da" : "#d1ecf1";
  msg.style.color =
    type === "success" ? "#155724" : type === "error" ? "#721c24" : "#0c5460";
  msg.style.border =
    type === "success"
      ? "1px solid #c3e6cb"
      : type === "error"
      ? "1px solid #f5c6cb"
      : "1px solid #bee5eb";

  document.querySelector(".settings-container")?.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

// ==============================
// Toggle password visibility
// ==============================
function initPasswordToggles() {
  const toggles = document.querySelectorAll(".toggle-password");
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = toggle.previousElementSibling;
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        toggle.textContent = "🙈";
      } else {
        input.type = "password";
        toggle.textContent = "👁️";
      }
    });
  });
}

// ==============================
// Update admin profile
// ==============================
async function updateAdminProfile(updatedData) {
  try {
    const user = Session.user();
    if (!user) return;

    const res = await fetch(`${BASE_URL}/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Profile update failed");
    }

    showMessage("Profile updated successfully!", "success");

    // Update session user info
    Object.assign(user, updatedData);
    loadAdminSettings();
  } catch (err) {
    showMessage(err.message, "error");
  }
}
// this is just for testing
// ==============================
// Change admin password
// ==============================
async function changeAdminPassword(currentPassword, newPassword) {
  try {
    const res = await fetch(`${BASE_URL}/users/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Password change failed");
    }

    showMessage("Password updated successfully!", "success");
    document.getElementById("password-change-form").reset();
  } catch (err) {
    showMessage(err.message, "error");
  }
}

// ==============================
// Load admin settings
// ==============================
function loadAdminSettings() {
  const user = Session.user();
  if (!user) {
    Swal.fire({
      icon: "warning",
      title: "Session Expired",
      text: "Please login again.",
      confirmButtonColor: "#1a9fff",
    }).then(() => {
      window.location.href = "login.html";
    });
    return;
  }

  // --- Fill admin form ---
  document.getElementById("admin-username").value = user.username || "";
  document.getElementById("admin-email").value = user.email || "";

  // --- Profile form submit ---
  const profileForm = document.getElementById("profile-settings-form");
  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updatedData = {
      username: document.getElementById("admin-username").value.trim(),
      email: document.getElementById("admin-email").value.trim(),
    };
    await updateAdminProfile(updatedData);
  });

  // --- Password form submit ---
  const passwordForm = document.getElementById("password-change-form");
  passwordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPwd = document.getElementById("current-password").value.trim();
    const newPwd = document.getElementById("new-password").value.trim();
    const confirmPwd = document.getElementById("confirm-password").value.trim();

    if (!currentPwd || !newPwd || !confirmPwd) {
      showMessage("All fields are required", "error");
      return;
    }
    if (newPwd !== confirmPwd) {
      showMessage("New passwords do not match", "error");
      return;
    }
    if (newPwd.length < 6) {
      showMessage("New password must be at least 6 characters", "error");
      return;
    }

    await changeAdminPassword(currentPwd, newPwd);
  });

  // --- Initialize password toggles ---
  initPasswordToggles();
}

// ==============================
// Initialize admin settings on load
// ==============================
window.addEventListener("DOMContentLoaded", loadAdminSettings);
