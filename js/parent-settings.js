// parent-settings.js
function initParentSettings() {
  const form = document.getElementById("password-change-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const currentPwd = document.getElementById("current-password").value.trim();
    const newPwd = document.getElementById("new-password").value.trim();
    const confirmPwd = document.getElementById("confirm-password").value.trim();

    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!loggedInUser) {
      alert("No logged in user found. Please login again.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const parent = users.find((u) => u.id === loggedInUser.id);

    if (!parent) {
      alert("Parent not found in LocalStorage.");
      return;
    }

    // Validate current password
    if (currentPwd !== parent.password) {
      alert("Current password is incorrect.");
      return;
    }

    // Validate new password match
    if (newPwd !== confirmPwd) {
      alert("New passwords do not match.");
      return;
    }

    // Optional: minimum length
    if (newPwd.length < 6) {
      alert("New password must be at least 6 characters long.");
      return;
    }

    // Update password
    parent.password = newPwd;
    localStorage.setItem("users", JSON.stringify(users));

    form.reset();
    alert("✅ Password updated successfully!");
  });
}
