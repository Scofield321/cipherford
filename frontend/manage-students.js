import { Session } from "./session.js";

import { BASE_URL } from "./config.js";
let editingStudent = null;

// ==============================
// Helper: Format date for <input type="date">
// ==============================
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ==============================
// Helper: Format time for <input type="time">
// ==============================
function formatTimeForInput(timeStr) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5); // HH:MM
}

// ==============================
// FETCH STUDENTS
// ==============================
async function fetchStudents() {
  try {
    const res = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch students");
    const data = await res.json();
    return data.students || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ==============================
// FETCH UPCOMING SESSIONS
// ==============================
async function fetchSessions(studentId) {
  try {
    const res = await fetch(`${BASE_URL}/upcoming_sessions/${studentId}`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch sessions");
    return await res.json();
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "Fetch Failed",
      text: "Failed to fetch sessions. Please try again.",
      confirmButtonColor: "#ff4d4f",
    });
    return [];
  }
}

// ==============================
// CREATE SESSION
// ==============================
async function createSession(studentId, sessionData) {
  try {
    const res = await fetch(`${BASE_URL}/upcoming_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
      body: JSON.stringify({ student_id: studentId, ...sessionData }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return await res.json();
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "Create Failed",
      text: "Failed to create session.",
      confirmButtonColor: "#ff4d4f",
    });
    throw err;
  }
}

// ==============================
// UPDATE SESSION
// ==============================
async function updateSession(sessionId, sessionData) {
  try {
    if (!sessionData.topic || !sessionData.date || !sessionData.time) {
      throw new Error("Topic, date, and time are required");
    }
    const res = await fetch(`${BASE_URL}/upcoming_sessions/${sessionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
      body: JSON.stringify(sessionData),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update session");
    }
    return await res.json();
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "Update Failed",
      text: `Failed to update session: ${err.message}`,
      confirmButtonColor: "#ff4d4f",
    });

    throw err;
  }
}

// ==============================
// DELETE SESSION
// ==============================
async function deleteSession(sessionId) {
  try {
    const res = await fetch(`${BASE_URL}/upcoming_sessions/${sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    if (!res.ok) throw new Error("Failed to delete session");
    return true;
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "Delete Failed",
      text: "Failed to delete session",
      confirmButtonColor: "#ff4d4f",
    });
    throw err;
  }
}

// ==============================
// UPDATE STUDENT
// ==============================
async function updateStudent(studentId, updatedData) {
  try {
    const res = await fetch(`${BASE_URL}/students/${studentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
      body: JSON.stringify(updatedData),
    });
    if (!res.ok) throw new Error("Failed to update student");
    return await res.json();
  } catch (err) {
    await Swal.fire({
      icon: "error",
      title: "Update Failed",
      text: "Update student failed",
      confirmButtonColor: "#ff4d4f",
    });
    throw err;
  }
}

// ==============================
// LOAD STUDENTS TABLE
// ==============================
async function loadStudentsTable() {
  const loader = document.getElementById("students-loader");
  const tbody = document.querySelector(".students-table tbody");

  if (!tbody || !loader) return;

  // Show loader and clear table
  loader.style.display = "block";
  tbody.innerHTML = "";

  try {
    const students = await fetchStudents();

    students.forEach((student, index) => {
      const fullName =
        `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
        "Unnamed";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${fullName}</td>
        <td>${student.email || "-"}</td>
        <td>${student.plan || "Free"}</td>
        <td>${student.points ?? 0}%</td>
        <td>${student.active === false ? "Inactive" : "Active"}</td>
        <td>
          <button class="btn-small edit" data-id="${student.id}">Edit</button>
          <button class="btn-small delete" data-id="${
            student.id
          }">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Add event handlers
    tbody.querySelectorAll(".delete").forEach((btn) => {
      btn.onclick = () => deleteStudent(btn.dataset.id);
    });

    tbody.querySelectorAll(".edit").forEach((btn) => {
      btn.onclick = async () => {
        // convert the id to string for better comparison
        const student = students.find((s) => String(s.id) === btn.dataset.id);
        if (!student)
          return console.error("Student not found for ID:", btn.dataset.id);
        await openEditModal(student);
      };
    });
  } catch (error) {
    console.error("Failed to load students:", error);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Failed to load data.</td></tr>`;
  } finally {
    // Hide loader
    loader.style.display = "none";
  }
}

// ==============================
// DELETE STUDENT
// ==============================
async function deleteStudent(studentId) {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: "This student will be permanently deleted.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ff4d4f",
    cancelButtonColor: "#aaa",
    confirmButtonText: "Yes, delete it!",
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${BASE_URL}/students/${studentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    if (!res.ok) throw new Error("Failed to delete student");
    await loadStudentsTable();
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "Delete Failed",
      text: "Failed to delete student",
      confirmButtonColor: "#ff4d4f",
    });
  }
}
// this is just for testing
// ==============================
// ADD SESSION INPUT
// ==============================
function addSessionInput(session = {}) {
  const container = document.getElementById("upcoming-sessions-container");
  const div = document.createElement("div");
  div.className = "upcoming-session-group";
  if (session.id) div.dataset.id = session.id;

  div.innerHTML = `
    <input type="date" class="session-date" value="${formatDateForInput(
      session.date
    )}" />
    <input type="time" class="session-time" value="${formatTimeForInput(
      session.time
    )}" />
    <input type="text" class="session-topic" placeholder="Topic" value="${
      session.topic || ""
    }" />
    <button type="button" class="remove-session-btn">❌</button>
  `;

  div.querySelector(".remove-session-btn").onclick = async () => {
    if (div.dataset.id) await deleteSession(div.dataset.id);
    div.remove();
  };

  container.appendChild(div);
}

// ==============================
// OPEN EDIT MODAL
// ==============================
async function openEditModal(student) {
  if (!student) return;
  editingStudent = student;

  const modal = document.getElementById("edit-student-modal");
  const sessionContainer = document.getElementById(
    "upcoming-sessions-container"
  );

  // =======================
  // Populate basic info
  // =======================
  document.getElementById("edit-username").value = `${
    student.first_name || ""
  } ${student.last_name || ""}`;
  document.getElementById("edit-level").value = student.level ?? 1;
  document.getElementById("edit-points").value = student.points ?? 0;
  document.getElementById("edit-projects").value = student.projects_done ?? 0;
  document.getElementById("edit-attendance-week").value =
    student.attendance_week ?? 0;
  document.getElementById("edit-attendance-month").value =
    student.attendance_month ?? 0;
  document.getElementById("edit-plan").value = student.plan || "Free";

  // =======================
  // Populate upcoming sessions
  // =======================
  sessionContainer.innerHTML = "";
  const sessions = await fetchSessions(student.id);
  sessions.forEach(addSessionInput);
  document.getElementById("add-session-btn").onclick = () => addSessionInput();

  // =======================
  // Populate badges, certificates, resources
  // =======================
  async function populateFiles() {
    const badgeContainer =
      document.getElementById("badge-list") || document.createElement("div");
    badgeContainer.id = "badge-list";
    badgeContainer.style.marginTop = "10px";
    badgeContainer.innerHTML = "";
    document.getElementById("award-badge-btn").before(badgeContainer);

    const certContainer =
      document.getElementById("certificate-list") ||
      document.createElement("div");
    certContainer.id = "certificate-list";
    certContainer.style.marginTop = "10px";
    document.getElementById("award-certificate-btn").before(certContainer);

    const resourceContainer =
      document.getElementById("resource-list") || document.createElement("div");
    resourceContainer.id = "resource-list";
    resourceContainer.style.marginTop = "10px";
    document.getElementById("award-resource-btn").before(resourceContainer);

    const [badges, certificates, resources] = await Promise.all([
      fetch(`${BASE_URL}/badges/${student.id}`, {
        headers: { Authorization: `Bearer ${Session.token()}` },
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/certificates/${student.id}`, {
        headers: { Authorization: `Bearer ${Session.token()}` },
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/resources/${student.id}`, {
        headers: { Authorization: `Bearer ${Session.token()}` },
      }).then((r) => r.json()),
    ]);

    // Helper: render item cards
    function renderItemCard(item, type) {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.gap = "8px";
      div.style.marginBottom = "4px";

      const titleHTML =
        type === "badge"
          ? `<span class="item-title">${item.title}</span>`
          : type === "resource"
          ? `<a href="${item.file_url}" target="_blank" class="item-title">${item.resource_name}</a>`
          : `<a href="${item.file_url}" target="_blank" class="item-title">${item.title}</a>`;
      div.innerHTML = `
        ${titleHTML}
        <button type="button" class="edit-item">✏️</button>
        <button type="button" class="remove-item" data-id="${item.id}">❌</button>
      `;

      const removeBtn = div.querySelector(".remove-item");
      removeBtn.onclick = async () => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        await fetch(`${BASE_URL}/${type}s/${item.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${Session.token()}` },
        });
        div.remove();
      };

      div.querySelector(".edit-item").onclick = () =>
        openEditFileForm(div, item, type);

      if (type === "badge") badgeContainer.appendChild(div);
      if (type === "certificate") certContainer.appendChild(div);
      if (type === "resource") resourceContainer.appendChild(div);
    }

    badges.forEach((badge) => renderItemCard(badge, "badge"));
    certificates.forEach((cert) => renderItemCard(cert, "certificate"));
    resources.forEach((res) => renderItemCard(res, "resource"));
  }

  await populateFiles();

  // =======================
  // Add new items
  // =======================
  async function addNewItem(type) {
    const titleEl = document.getElementById(`${type}-title`);
    const descEl = document.getElementById(`${type}-description`);
    const fileEl = document.getElementById(`${type}-file`);
    const nameEl = document.getElementById(`${type}-name`);

    const title = titleEl ? titleEl.value.trim() : nameEl.value.trim();
    const description = descEl ? descEl.value.trim() : "";
    const file = fileEl ? fileEl.files[0] : null;
    if (!title || !file) return alert("Title/Name and file are required");

    const formData = new FormData();
    if (type === "resource") formData.append("resource_name", title);
    else {
      formData.append("title", title);
      formData.append("description", description);
    }
    formData.append("file", file);
    formData.append("student_id", student.id);

    const res = await fetch(
      `${BASE_URL}/${type === "resource" ? "resources" : type + "s"}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${Session.token()}` },
        body: formData,
      }
    );
    if (res.ok) {
      await populateFiles();
      if (titleEl) titleEl.value = "";
      if (descEl) descEl.value = "";
      if (fileEl) fileEl.value = "";
      if (nameEl) nameEl.value = "";
    }
  }

  document.getElementById("award-badge-btn").onclick = () =>
    addNewItem("badge");
  document.getElementById("award-certificate-btn").onclick = () =>
    addNewItem("certificate");
  document.getElementById("award-resource-btn").onclick = () =>
    addNewItem("resource");

  // =======================
  // Submit student + sessions updates
  // =======================
  const form = document.getElementById("edit-student-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const sessionGroups = Array.from(
      sessionContainer.querySelectorAll(".upcoming-session-group")
    );
    try {
      const sessionPromises = sessionGroups.map(async (div) => {
        const sessionData = {
          topic: div.querySelector(".session-topic").value.trim(),
          date: div.querySelector(".session-date").value,
          time:
            div.querySelector(".session-time").value.length === 5
              ? div.querySelector(".session-time").value + ":00"
              : div.querySelector(".session-time").value,
        };
        return div.dataset.id
          ? await updateSession(div.dataset.id, sessionData)
          : await createSession(editingStudent.id, sessionData);
      });
      await Promise.all(sessionPromises);

      const updatedData = {
        level: parseInt(document.getElementById("edit-level").value) || 1,
        points: parseInt(document.getElementById("edit-points").value) || 0,
        projects_done:
          parseInt(document.getElementById("edit-projects").value) || 0,
        attendance_week:
          parseInt(document.getElementById("edit-attendance-week").value) || 0,
        attendance_month:
          parseInt(document.getElementById("edit-attendance-month").value) || 0,
        plan: document.getElementById("edit-plan").value.trim(),
      };
      await updateStudent(editingStudent.id, updatedData);

      Swal.fire({
        icon: "success",
        title: "Update Successful",
        text: "Student, sessions, badges, certificates, and resources updated successfully!",
        confirmButtonColor: "#ff4d4f",
      });
      await loadStudentsTable();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message || "Failed to update student data",
        confirmButtonColor: "#ff4d4f",
      });
    }
  };

  modal.style.display = "flex";

  // =======================
  // Inline edit function for files
  // =======================
  // function openEditFileForm(containerDiv, item, type) {
  //   if (containerDiv.querySelector(".edit-form")) return;
  // testing
  //   const form = document.createElement("form");
  //   form.className = "edit-form";
  //   form.style.marginTop = "6px";
  //   form.style.display = "flex";
  //   form.style.flexDirection = "column";
  //   form.style.gap = "4px";

  //   const titleInput = document.createElement("input");
  //   titleInput.type = "text";
  //   titleInput.value = item.title || item.name || "";
  //   titleInput.placeholder = "Title / Name";
  //   form.appendChild(titleInput);

  //   let descInput;
  //   if (type !== "resource") {
  //     descInput = document.createElement("input");
  //     descInput.type = "text";
  //     descInput.value = item.description || "";
  //     descInput.placeholder = "Description";
  //     form.appendChild(descInput);
  //   }

  //   const fileInput = document.createElement("input");
  //   fileInput.type = "file";
  //   fileInput.accept = type === "badge" ? "image/*" : ".pdf";
  //   form.appendChild(fileInput);

  //   const saveBtn = document.createElement("button");
  //   saveBtn.type = "submit";
  //   saveBtn.textContent = "Save";
  //   saveBtn.style.marginTop = "4px";
  //   form.appendChild(saveBtn);

  //   form.onsubmit = async (e) => {
  //     e.preventDefault();
  //     const formData = new FormData();
  //     if (type === "resource") formData.append("name", titleInput.value.trim());
  //     else {
  //       formData.append("title", titleInput.value.trim());
  //       formData.append("description", descInput.value.trim());
  //     }
  //     if (fileInput.files[0]) formData.append("file", fileInput.files[0]);

  //     const res = await fetch(`${BASE_URL}/${type}s/${item.id}`, {
  //       method: "PUT",
  //       headers: { Authorization: `Bearer ${Session.token()}` },
  //       body: formData,
  //     });
  //     if (res.ok) await populateFiles();
  //   };

  //   containerDiv.appendChild(form);
  // }
}

// ==============================
// INIT
// ==============================
export async function initManageStudents() {
  await loadStudentsTable();
}

// Close modal
document.querySelector("#edit-student-modal .close").onclick = () => {
  document.getElementById("edit-student-modal").style.display = "none";
};
