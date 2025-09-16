const createAccountBtn = document.getElementById("create-account-btn");

createAccountBtn.addEventListener("click", () => {
  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("email").value.trim();
  const country = document.getElementById("country").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const role = document.querySelector('input[name="role"]:checked')?.value;

  // Parent input fields
  const wechat = document.getElementById("wechat")?.value.trim();
  const childEmail = document.getElementById("child-email")?.value.trim();

  // Student input fields
  const parentEmail = document.getElementById("parent-email")?.value.trim();

  if (!username || !email || !country || !password || !role) {
    alert("Please fill in all required fields.");
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];

  // Check for duplicate email
  if (users.some((user) => user.email === email)) {
    alert("Email already registered.");
    return;
  }

  // Base user object
  const newUser = {
    id: username.toLowerCase().replace(/\s/g, "_"),
    username,
    email,
    country,
    password,
    role,
  };

  if (role === "parent") {
    if (!childEmail) {
      alert("Please enter your child's email to continue.");
      return;
    }

    const linkedStudent = users.find(
      (user) => user.role === "student" && user.email === childEmail
    );

    if (!linkedStudent) {
      alert(
        "It looks like your child is not registered yet. Please register the student first before creating the parent account."
      );
      return;
    }

    // Parent-specific fields
    newUser.wechat = wechat || "";
    newUser.childIds = [linkedStudent.id]; // store first child
  }

  if (role === "student") {
    newUser.level = 1;
    newUser.points = 0;
    newUser.attendanceWeek = 0;
    newUser.attendanceMonth = 0;
    newUser.projectsDone = 0;
    newUser.upcomingSessions = [];
    newUser.avatar = "";

    // Optional: Link to parent if parent email provided
    if (parentEmail) {
      const parentUser = users.find(
        (user) => user.role === "parent" && user.email === parentEmail
      );

      if (parentUser) {
        if (!parentUser.childIds) parentUser.childIds = [];
        if (!parentUser.childIds.includes(newUser.id)) {
          parentUser.childIds.push(newUser.id);
        }

        // Update parent in users array
        users = users.map((u) =>
          u.email === parentUser.email ? parentUser : u
        );
      }
    }
  }

  // Save new user
  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  alert(`Account created successfully! Welcome, ${username}.`);
  window.location.href = "login.html";
});
