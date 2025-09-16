let editingStudentId = null;

// ---------- LOAD STUDENTS TABLE ----------
function loadStudentsTable() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const students = users.filter((u) => u.role === "student");

  const tbody = document.querySelector(".students-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  students.forEach((student, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${student.username || "Unnamed"}</td>
      <td>${student.email}</td>
      <td>${student.plan || "Free"}</td>
      <td>${student.points ?? 0}%</td>
      <td>${student.active === false ? "Inactive" : "Active"}</td>
      <td>
        <button class="btn-small edit" data-id="${student.id}">Edit</button>
        <button class="btn-small delete" data-id="${student.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // DELETE
  tbody.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentId = btn.dataset.id;
      if (confirm("Are you sure you want to delete this student?")) {
        const remaining = users.filter((u) => u.id !== studentId);
        localStorage.setItem("users", JSON.stringify(remaining));
        loadStudentsTable();
      }
    });
  });

  // EDIT
  // Event delegation for the tbody
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".edit");
    if (!btn) return;
    const studentId = btn.dataset.id;
    openEditModal(studentId);
  });

  // VIEW
  tbody.querySelectorAll(".view").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert(`View details for student ID: ${btn.dataset.id} coming soon.`);
    });
  });

  // Attach modal handler after table and modal exist
  attachEditFormHandler();
}

// ---------- OPEN EDIT MODAL ----------
function openEditModal(studentId) {
  console.log("Editing student ID:", studentId); // only log ID
  editingStudentId = studentId;

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const student = users.find((u) => u.id === studentId);
  if (!student) return;

  const modal = document.getElementById("edit-student-modal");
  const form = document.getElementById("edit-student-form");

  if (!modal || !form) {
    console.warn("Modal or form not found!");
    return;
  }

  // Fill form fields
  form["edit-username"].value = student.username;
  form["edit-level"].value = student.level ?? 1;
  form["edit-points"].value = student.points ?? 0;
  form["edit-projects"].value = student.projectsDone ?? 0;
  form["edit-attendance-week"].value = student.attendanceWeek ?? 0;
  form["edit-attendance-month"].value = student.attendanceMonth ?? 0;
  form["edit-plan"].value = student.plan || "Free";

  // Fill upcoming sessions container
  const container = document.getElementById("upcoming-sessions-container");
  container.innerHTML = ""; // clear previous

  (student.upcomingSessions || []).forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "session-inputs";
    div.dataset.index = i;
    div.innerHTML = `
      <input type="date" class="session-date" value="${s.date || ""}" />
      <input type="time" class="session-time" value="${s.time || ""}" />
      <input type="text" class="session-topic" placeholder="Topic" value="${
        s.topic || ""
      }" />
      <button type="button" class="remove-session-btn">❌</button>
    `;
    container.appendChild(div);
  });

  // Attach remove button handlers for existing sessions
  container.querySelectorAll(".remove-session-btn").forEach((btn) => {
    btn.onclick = () => btn.parentElement.remove();
  });

  // ADD SESSION BUTTON HANDLER
  const addSessionBtn = document.getElementById("add-session-btn");
  if (addSessionBtn) {
    addSessionBtn.onclick = () => {
      const div = document.createElement("div");
      div.className = "session-inputs";
      div.innerHTML = `
        <input type="date" class="session-date" />
        <input type="time" class="session-time" />
        <input type="text" class="session-topic" placeholder="Topic" />
        <button type="button" class="remove-session-btn">❌</button>
      `;
      container.appendChild(div);

      // Attach remove handler for this new session
      div.querySelector(".remove-session-btn").onclick = () => div.remove();
    };
  }

  // Display modal
  modal.style.display = "flex";
}

// ---------- ATTACH FORM HANDLER ----------
function attachEditFormHandler() {
  const modal = document.getElementById("edit-student-modal");
  const form = document.getElementById("edit-student-form");
  const closeBtn = modal?.querySelector(".close");

  if (!modal || !form) return;

  // Remove previous listeners
  const newForm = form.cloneNode(true);
  form.replaceWith(newForm);

  // Close modal
  if (closeBtn) {
    closeBtn.onclick = () => (modal.style.display = "none");
  }

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };

  newForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editingStudentId) return;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const index = users.findIndex((u) => u.id === editingStudentId);
    if (index === -1) return;

    const student = users[index];

    student.username = newForm["edit-username"].value.trim();
    student.level = parseInt(newForm["edit-level"].value) || 1;
    student.points = parseInt(newForm["edit-points"].value) || 0;
    student.projectsDone = parseInt(newForm["edit-projects"].value) || 0;
    student.attendanceWeek =
      parseInt(newForm["edit-attendance-week"].value) || 0;
    student.attendanceMonth =
      parseInt(newForm["edit-attendance-month"].value) || 0;
    student.plan = newForm["edit-plan"].value.trim();

    // Collect sessions from individual inputs
    const container = document.getElementById("upcoming-sessions-container");
    student.upcomingSessions = Array.from(
      container.querySelectorAll(".session-inputs")
    ).map((div) => ({
      date: div.querySelector(".session-date").value,
      time: div.querySelector(".session-time").value,
      topic: div.querySelector(".session-topic").value.trim(),
    }));

    localStorage.setItem("users", JSON.stringify(users));
    modal.style.display = "none";
    loadStudentsTable();
  });
}

// ---------- INIT ----------
function initManageStudents() {
  loadStudentsTable();
  setupSearchBar();
}

initManageStudents();
