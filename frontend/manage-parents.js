import { Session } from "./session.js";

import { BASE_URL } from "./config.js";
let editingParent = null;

// ---------- FETCH PARENTS ----------
async function fetchParents() {
  try {
    const res = await fetch(`${BASE_URL}/parents`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch parents");
    const data = await res.json();
    return data.parents || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ---------- DELETE PARENT ----------
async function deleteParent(parentId) {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: "Do you really want to delete this parent?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ff4d4f",
    cancelButtonColor: "#1a9fff",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
  });

  if (!result.isConfirmed) return;

  const loader = document.getElementById("parents-loader");
  if (loader) loader.style.display = "block";

  try {
    const res = await fetch(`${BASE_URL}/parents/${parentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${Session.token()}` },
    });

    if (!res.ok) throw new Error("Failed to delete parent");

    Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: "Parent has been deleted.",
      confirmButtonColor: "#1a9fff",
    });

    // Reload table after deletion
    await loadParentsTable();
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to delete parent",
      confirmButtonColor: "#ff4d4f",
    });
  } finally {
    if (loader) loader.style.display = "none";
  }
}

// ---------- UPDATE PARENT ----------
async function updateParent(parentId, updatedData) {
  const loader = document.getElementById("parents-loader");
  if (loader) loader.style.display = "block";

  try {
    const res = await fetch(`${BASE_URL}/parents/${parentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
      body: JSON.stringify(updatedData),
    });

    if (!res.ok) throw new Error("Failed to update parent");

    const data = await res.json();

    Swal.fire({
      icon: "success",
      title: "Parent Updated",
      text: "The parent details have been successfully updated.",
      confirmButtonColor: "#1a9fff",
    });

    return data;
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Update Failed",
      text: "Failed to update parent. Please try again.",
      confirmButtonColor: "#ff4d4f",
    });
    throw err;
  } finally {
    if (loader) loader.style.display = "none";
  }
}

// ---------- LOAD PARENTS TABLE ----------
async function loadParentsTable() {
  const loader = document.getElementById("parents-loader");
  const tbody = document.querySelector(".parents-table tbody");
  if (!tbody) return;

  // Show loader and disable table
  if (loader) loader.style.display = "block";
  const table = tbody.closest(".parents-table");
  if (table) table.classList.add("loading");

  try {
    const parents = await fetchParents();
    tbody.innerHTML = "";

    parents.forEach((parent, index) => {
      const tr = document.createElement("tr");

      const fullName = `${parent.first_name || ""} ${parent.last_name || ""}`;
      const childrenNames =
        (parent.children || [])
          .map((c) => `${c.first_name} ${c.last_name}`)
          .join(", ") || "-";

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${fullName}</td>
        <td>${parent.email || "-"}</td>
        <td>${childrenNames}</td>
        <td>${parent.country || "-"}</td>
        <td>${parent.session_count ?? 0}</td>
        <td>
          <button class="btn-small edit" data-id="${parent.id}">Edit</button>
          <button class="btn-small delete" data-id="${
            parent.id
          }">Delete</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Attach delete handlers
    tbody.querySelectorAll(".delete").forEach((btn) => {
      btn.onclick = () => deleteParent(btn.dataset.id);
    });

    // Attach edit handlers
    tbody.querySelectorAll(".edit").forEach((btn) => {
      btn.onclick = async () => {
        const parent = parents.find((p) => p.id === btn.dataset.id);
        openEditModal(parent);
      };
    });
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to load parents. Please try again.",
      confirmButtonColor: "#ff4d4f",
    });
  } finally {
    // Hide loader and enable table
    if (loader) loader.style.display = "none";
    if (table) table.classList.remove("loading");
  }
}

// ---------- OPEN EDIT MODAL ----------
function openEditModal(parent) {
  if (!parent) return;
  editingParent = parent;

  const modal = document.getElementById("edit-parent-modal");
  const form = document.getElementById("edit-parent-form");
  if (!modal || !form) return;

  // Populate form fields
  form["edit-first-name"].value = parent.first_name || "";
  form["edit-last-name"].value = parent.last_name || "";
  form["edit-email"].value = parent.email || "";
  form["edit-country"].value = parent.country || "";
  form["edit-session-count"].value = parent.session_count ?? 0;

  modal.style.display = "flex";

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!editingParent) return;

    // Collect all updated fields
    const updatedData = {
      first_name: form["edit-first-name"].value.trim(),
      last_name: form["edit-last-name"].value.trim(),
      email: form["edit-email"].value.trim(),
      country: form["edit-country"].value.trim(),
      session_count: parseInt(form["edit-session-count"].value) || 0,
    };

    try {
      await updateParent(editingParent.id, updatedData);
      modal.style.display = "none";
      loadParentsTable();
      editingParent = null;
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update parent info. Please try again.",
        confirmButtonColor: "#ff4d4f",
      });
    }
  };
}

// ---------- INIT ----------
export async function initManageParents() {
  await loadParentsTable();
}
// this is just for testing
// Close modal
document.querySelector("#edit-parent-modal .close").onclick = () => {
  document.getElementById("edit-parent-modal").style.display = "none";
};
