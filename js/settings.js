function getLoggedInUser() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    showMessage("No logged in user found!", "error");
    return null;
  }
  return user;
}

function saveLoggedInUserToStorage(updatedUser) {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const index = users.findIndex((u) => u.id === updatedUser.id);
  if (index !== -1) {
    users[index] = updatedUser;
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
  }
}

function loadLoggedInUserData() {
  const user = getLoggedInUser();
  if (!user) return;

  document.getElementById("admin-username").value = user.username || "";
  document.getElementById("admin-email").value = user.email || "";

  // Avatar preview (if previously uploaded)
  if (user.avatar && document.getElementById("admin-avatar-preview")) {
    document.getElementById("admin-avatar-preview").src = user.avatar;
  }

  // Profile Form
  const profileForm = document.getElementById("profile-settings-form");
  if (profileForm) {
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      updateUserProfile();
    });
  }

  // Avatar Preview
  const avatarInput = document.getElementById("admin-avatar");
  if (avatarInput) {
    avatarInput.addEventListener("change", function () {
      const file = avatarInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const user = getLoggedInUser();
        if (user) {
          user.avatar = e.target.result;
          saveLoggedInUserToStorage(user);
          if (document.getElementById("admin-avatar-preview")) {
            document.getElementById("admin-avatar-preview").src = user.avatar;
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Password Change Form
  const passwordForm = document.getElementById("password-change-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", function (e) {
      e.preventDefault();
      changePassword();
    });
  }
}

function updateUserProfile() {
  const username = document.getElementById("admin-username").value.trim();
  const email = document.getElementById("admin-email").value.trim();

  if (!username || !email) {
    showMessage("Please fill in all required fields.", "error");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage("Invalid email address.", "error");
    return;
  }

  const user = getLoggedInUser();
  if (!user) return;

  const users = JSON.parse(localStorage.getItem("users")) || [];

  const usernameTaken = users.some(
    (u) => u.username === username && u.id !== user.id
  );

  if (usernameTaken) {
    showMessage("Username already taken by another user.", "error");
    return;
  }

  user.username = username;
  user.email = email;

  saveLoggedInUserToStorage(user);
  showMessage("Profile updated successfully!", "success");
}

function changePassword() {
  const currentPassword = document
    .getElementById("current-password")
    .value.trim();
  const newPassword = document.getElementById("new-password").value.trim();
  const confirmPassword = document
    .getElementById("confirm-password")
    .value.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    showMessage("All password fields are required.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage("New passwords do not match.", "error");
    return;
  }

  if (newPassword.length < 6) {
    showMessage("New password must be at least 6 characters.", "error");
    return;
  }

  const user = getLoggedInUser();
  if (!user) return;

  if (user.password !== currentPassword) {
    showMessage("Current password is incorrect.", "error");
    return;
  }

  user.password = newPassword;
  saveLoggedInUserToStorage(user);

  // Clear fields
  document.getElementById("current-password").value = "";
  document.getElementById("new-password").value = "";
  document.getElementById("confirm-password").value = "";

  showMessage("Password updated successfully!", "success");
}

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

  setTimeout(() => {
    msg.remove();
  }, 4000);
}

// Run when view is loaded
loadLoggedInUserData();
