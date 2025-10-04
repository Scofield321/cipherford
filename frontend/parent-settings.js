import { Session } from "./session.js";
const token = Session.token();
import { BASE_URL } from "./config.js";
// ==============================
// Fetch logged-in parent data
// ==============================
async function getParentData() {
  try {
    const res = await fetch(`${BASE_URL}/users/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Not logged in");

    const parent = await res.json();
    if (parent.role !== "parent") throw new Error("Access denied");

    return parent;
  } catch (err) {
    await Swal.fire({
      icon: "error",
      title: "Session Error",
      text: err.message,
      confirmButtonColor: "#1a9fff",
    });
    window.location.href = "login.html";
    return null;
  }
}

// ==============================
// Save updated parent profile
// ==============================
async function updateParentProfile(updatedData) {
  try {
    const parent = await getParentData();
    if (!parent) return;

    const res = await fetch(`${BASE_URL}/users/${parent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Update failed");
    }

    await Swal.fire({
      icon: "success",
      title: "Profile Updated",
      text: "✅ Profile updated successfully!",
      confirmButtonColor: "#1a9fff",
    });

    loadParentSettings(); // reload form
  } catch (err) {
    await Swal.fire({
      icon: "error",
      title: "Update Failed",
      text: err.message,
      confirmButtonColor: "#ff4d4f",
    });
  }
}

// ==============================
// Change password
// ==============================
async function changeParentPassword(currentPassword, newPassword) {
  try {
    const res = await fetch("/api/users/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Password change failed");
    }

    await Swal.fire({
      icon: "success",
      title: "Password Updated",
      text: "✅ Password updated successfully!",
      confirmButtonColor: "#1a9fff",
    });

    document.getElementById("password-change-form").reset();
  } catch (err) {
    await Swal.fire({
      icon: "error",
      title: "Change Failed",
      text: err.message,
      confirmButtonColor: "#ff4d4f",
    });
  }
}

// ==============================
// Load parent settings form
// ==============================
async function loadParentSettings() {
  const parent = await getParentData();
  if (!parent) return;

  // Fill profile form
  document.getElementById("parent-username").value = parent.username || "";
  document.getElementById("parent-email").value = parent.email || "";
  // this is just for testing
  // Profile form submit
  const profileForm = document.getElementById("profile-settings-form");
  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updatedData = {
      username: document.getElementById("parent-username").value.trim(),
      email: document.getElementById("parent-email").value.trim(),
    };
    await updateParentProfile(updatedData);
  });

  // Password change form submit
  const passwordForm = document.getElementById("password-change-form");
  passwordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPwd = document.getElementById("current-password").value.trim();
    const newPwd = document.getElementById("new-password").value.trim();
    const confirmPwd = document.getElementById("confirm-password").value.trim();

    if (!currentPwd || !newPwd || !confirmPwd) {
      await Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "All fields are required",
        confirmButtonColor: "#ffcc00",
      });
      return;
    }
    if (newPwd !== confirmPwd) {
      await Swal.fire({
        icon: "warning",
        title: "Mismatch",
        text: "New passwords do not match",
        confirmButtonColor: "#ffcc00",
      });
      return;
    }
    if (newPwd.length < 6) {
      await Swal.fire({
        icon: "warning",
        title: "Too Short",
        text: "New password must be at least 6 characters",
        confirmButtonColor: "#ffcc00",
      });
      return;
    }

    await changeParentPassword(currentPwd, newPwd);
  });
}

// ==============================
// Initialize on DOM load
// ==============================
window.addEventListener("DOMContentLoaded", loadParentSettings);
