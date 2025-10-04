import { Session } from "./session.js";
import { BASE_URL } from "./config.js";

const loginBtn = document.getElementById("login-btn");

function showToast(message, type = "success", duration = 2000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slide-out 0.3s forwards";
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

loginBtn.addEventListener("click", async () => {
  const loader = document.getElementById("login-loader");
  loader.style.display = "block"; // show loader

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();

  if (!email || !password) {
    loader.style.display = "none"; // hide loader
    showToast("Please enter both email and password.", "error");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.msg || "Invalid credentials");
    }

    const { token, user } = await res.json();

    Session.set({ token, user });

    loader.style.display = "none"; // hide loader
    showToast(`Welcome back, ${user.first_name} ${user.last_name}!`, "success");

    const redirectMap = {
      student: "student-dashboard.html",
      parent: "parents-dashboard.html",
      admin: "admin-dashboard.html",
    };
    window.location.href = redirectMap[user.role];
  } catch (err) {
    loader.style.display = "none"; // hide loader
    console.error(err);
    showToast(err.message, "error");
  }
});
