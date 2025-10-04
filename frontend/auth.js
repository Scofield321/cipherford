import { Session } from "./session.js";
import { BASE_URL } from "./config.js";
const createAccountBtn = document.getElementById("create-account-btn");
function showToast(message, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Remove after duration
  setTimeout(() => {
    toast.style.animation = "slide-out 0.3s forwards";
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

createAccountBtn.addEventListener("click", async () => {
  // loader
  const loader = document.getElementById("signup-loader");
  loader.style.display = "block"; // show loader
  const first_name = document.getElementById("first_name").value.trim();
  const last_name = document.getElementById("last_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const country = document.getElementById("country").value.trim();
  const role = document.querySelector('input[name="role"]:checked')?.value;

  if (!first_name || !last_name || !email || !password || !role || !country) {
    loader.style.display = "none"; // hide loader
    showToast("Please fill in all required fields", "error");
    return;
  }
  // Role-specific fields
  const parent_email =
    role === "student"
      ? document.getElementById("parent-email")?.value.trim()
      : null;
  const wechat =
    role === "parent" ? document.getElementById("wechat")?.value.trim() : null;
  const child_email =
    role === "parent"
      ? document.getElementById("child-email")?.value.trim()
      : null;

  // Use FormData
  const formData = new FormData();
  formData.append("first_name", first_name);
  formData.append("last_name", last_name);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("role", role);
  formData.append("country", country);
  if (parent_email) formData.append("parent_email", parent_email);
  if (wechat) formData.append("wechat", wechat);
  if (child_email) formData.append("child_email", child_email);

  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.msg || "Failed to create account");
    }

    const { token, user } = await res.json();

    // Store session using Session.js
    Session.set({ token, user });

    loader.style.display = "none"; // hide loader
    showToast(`Welcome, ${user.first_name} ${user.last_name}!`, "success");

    // Redirect based on role
    const redirectMap = {
      student: "student-dashboard.html",
      parent: "parents-dashboard.html",
      admin: "admin-dashboard.html",
    };
    window.location.href = redirectMap[user.role];
  } catch (err) {
    loader.style.display = "none"; // hide loader
    createAccountBtn.disabled = false;
    console.error(err);
    showToast(err.message, "error");
  }
});
