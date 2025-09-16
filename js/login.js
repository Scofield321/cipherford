const loginBtn = document.getElementById("login-btn");

loginBtn.addEventListener("click", () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    alert("Invalid email or password.");
    return;
  }

  // Store logged-in user in role-specific key
  if (user.role === "student") {
    localStorage.setItem("loggedInStudent", JSON.stringify(user));
  } else if (user.role === "parent") {
    localStorage.setItem("loggedInParent", JSON.stringify(user));
  } else if (user.role === "admin") {
    localStorage.setItem("loggedInAdmin", JSON.stringify(user));
  }

  alert(`Welcome back, ${user.username}!`);

  // Redirect based on role
  if (user.role === "student") {
    window.location.href = "student-dashboard.html";
  } else if (user.role === "parent") {
    window.location.href = "parents-dashboard.html";
  } else if (user.role === "admin") {
    window.location.href = "admin-dashboard.html";
  }
});
