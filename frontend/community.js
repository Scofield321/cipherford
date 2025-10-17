import { Session } from "./session.js";
import { BASE_URL } from "./config.js";

const communityQASection = document.querySelector("#community-qa .qa-section");
const askQuestionBtn = document.getElementById("ask-question-btn");
const submitQuestionSection = document.getElementById(
  "submit-question-section"
);

const titleInput = document.getElementById("question-title-input");
const bodyInput = document.getElementById("question-body-input");
const submitSection = document.getElementById("submit-question-section");
// const cancelBtn = document.getElementById("cancel-question");
const cancelQuestionBtn = document.getElementById("cancel-question");

const submitForm = document.getElementById("submit-question-form");
const adminPostsList = document.querySelector(
  "#community-admin-posts .admin-posts-list"
);

const aiForm = document.getElementById("ai-form");
const aiInput = document.getElementById("ai-input");
const aiChatBox = document.getElementById("ai-chat-box");
const aiQuickButtons = document.querySelectorAll(".ai-prompt-btn");

document.addEventListener("DOMContentLoaded", () => {
  const askQuestionBtn = document.getElementById("ask-question-btn");
  const cancelQuestionBtn = document.getElementById("cancel-question");
  const submitQuestionSection = document.getElementById(
    "submit-question-section"
  );

  if (askQuestionBtn && submitQuestionSection) {
    askQuestionBtn.addEventListener("click", () => {
      submitQuestionSection.style.display = "block";
      askQuestionBtn.style.display = "none";
    });
  }

  if (cancelQuestionBtn && submitQuestionSection && askQuestionBtn) {
    cancelQuestionBtn.addEventListener("click", () => {
      submitQuestionSection.style.display = "none";
      askQuestionBtn.style.display = "inline-block";
    });
  }
});

// ------------------
// Admin Section Toggle
// ------------------
const adminQuizSection = document.getElementById("admin-quiz-section");
const toggleAdminBtn = document.getElementById("toggle-admin-view");

if (Session.user().role === "admin") {
  if (adminQuizSection) adminQuizSection.style.display = "block";
  if (toggleAdminBtn) {
    toggleAdminBtn.style.display = "inline-block";
    toggleAdminBtn.onclick = () => {
      adminQuizSection.style.display =
        adminQuizSection.style.display === "none" ? "block" : "none";
    };
  }
}

// ------------------
// User Quiz Logic
// ------------------
let quizzes = [];
let currentQuizIndex = 0;

const puzzleQuestion = document.getElementById("puzzle-question");
const quizForm = document.getElementById("quiz-form");
const quizOptionsForm = document.getElementById("quiz-options-form");
const submitQuizBtn = document.getElementById("submit-quiz");
const quizResult = document.getElementById("quiz-result");
const startQuizBtn = document.querySelector(".quiz-btn");

export async function loadUserQuizzes() {
  if (puzzleQuestion) puzzleQuestion.textContent = "Loading quiz...";
  try {
    const res = await fetch(`${BASE_URL}/quizzes`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    quizzes = await res.json();
  } catch (err) {
    console.error(err);
    if (puzzleQuestion) puzzleQuestion.textContent = "Failed to load quizzes.";
  }
}

function showQuiz(index) {
  if (!puzzleQuestion || !quizForm || !quizOptionsForm || !startQuizBtn) return;

  const quiz = quizzes[index];
  if (!quiz) {
    puzzleQuestion.textContent = "No more quizzes!";
    quizForm.style.display = "none";
    startQuizBtn.style.display = "inline-block";
    return;
  }

  puzzleQuestion.textContent = `Puzzle: ${quiz.question}`;
  quizOptionsForm.innerHTML = "";

  quiz.options.forEach((opt, i) => {
    const id = `option-${i}`;
    const div = document.createElement("div");
    div.innerHTML = `
      <input type="radio" id="${id}" name="quiz-option" value="${opt}" />
      <label for="${id}">${opt}</label>
    `;
    quizOptionsForm.appendChild(div);
  });

  quizForm.style.display = "block";
  quizResult.textContent = "";
}

// Start Quiz
if (startQuizBtn) {
  startQuizBtn.onclick = () => {
    currentQuizIndex = 0;
    showQuiz(currentQuizIndex);
    startQuizBtn.style.display = "none";
  };
}

// Submit Answer
if (submitQuizBtn) {
  submitQuizBtn.onclick = async () => {
    const selectedOption = quizOptionsForm.querySelector(
      'input[name="quiz-option"]:checked'
    )?.value;
    if (!selectedOption) return alert("Select an answer first.");

    const quizId = quizzes[currentQuizIndex].id;
    const userId = Session.user().id;

    try {
      const res = await fetch(`${BASE_URL}/quizzes/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Session.token()}`,
        },
        body: JSON.stringify({ quizId, userId, selectedOption }),
      });

      const data = await res.json();
      quizResult.textContent = data.correct
        ? `Correct! XP awarded: ${data.xp}`
        : `Incorrect! The correct answer was: ${quizzes[currentQuizIndex].correct_answer}`;

      currentQuizIndex++;
      setTimeout(() => showQuiz(currentQuizIndex), 3000);
    } catch (err) {
      console.error(err);
    }
  };
}

// ------------------------
// Admin Quiz Management
// ------------------------
const userQuizSection = document.getElementById("user-quiz-section");
let createQuizForm, quizTableBody;

// Only for admins
if (Session.user().role === "admin" && userQuizSection) {
  // 1️⃣ Create the admin quiz section once
  const adminQuizSection = document.createElement("section");
  adminQuizSection.id = "admin-quiz-section";
  adminQuizSection.innerHTML = `
    <form id="create-quiz-form" class="quiz-form">
      <textarea id="quiz-question-input" rows="5" placeholder="Enter your quiz question..." required></textarea>
      <input id="quiz-options-input" type="text" placeholder="Options (comma-separated)" required />
      <input id="quiz-correct-input" type="text" placeholder="Correct Answer" required />
      <input id="quiz-tags-input" type="text" placeholder="Tags (comma-separated)" />
      <button type="submit" class="submit-btn">Submit Quiz</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>Question</th>
          <th>Options</th>
          <th>Correct</th>
          <th>Tags</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="quiz-table-body"></tbody>
    </table>
  `;
  userQuizSection.appendChild(adminQuizSection);
  adminQuizSection.classList.add("hidden"); // initially hidden

  // 2️⃣ Grab form and table
  createQuizForm = document.getElementById("create-quiz-form");
  quizTableBody = document.getElementById("quiz-table-body");

  // 3️⃣ Toggle admin section with button
  const manageQuizzesBtn = document.getElementById("manage-quizzes-btn");
  manageQuizzesBtn.style.display = "inline-block";
  manageQuizzesBtn.addEventListener("click", () => {
    adminQuizSection.classList.toggle("hidden");
    if (!quizTableBody.children.length) loadAdminQuizzes();
  });

  // 4️⃣ Handle create/update
  createQuizForm.addEventListener("submit", async (e) => {
    e.preventDefault(); //prevent page reload

    const quizId = createQuizForm.dataset.editingId;
    const question = document
      .getElementById("quiz-question-input")
      .value.trim();
    const options = document
      .getElementById("quiz-options-input")
      .value.split(",")
      .map((o) => o.trim());
    const correct_answer = document
      .getElementById("quiz-correct-input")
      .value.trim();
    const tags = document
      .getElementById("quiz-tags-input")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = { question, options, correct_answer, tags };
    const url = quizId
      ? `${BASE_URL}/quizzes/${quizId}`
      : `${BASE_URL}/quizzes`;
    const method = quizId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Session.token()}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      const quiz = data.quiz || { ...payload, id: quizId }; // fallback if server doesn't return

      if (quizId) {
        // Update row in-place
        const row = quizTableBody
          .querySelector(`button.edit-btn[data-id="${quizId}"]`)
          ?.closest("tr");
        if (row) {
          row.children[0].textContent = quiz.question;
          row.children[1].textContent = quiz.options.join(", ");
          row.children[2].textContent = quiz.correct_answer;
          row.children[3].textContent = (quiz.tags || []).join(", ");
        }
      } else {
        addQuizRow(quiz);
      }

      // Reset form
      createQuizForm.reset();
      delete createQuizForm.dataset.editingId;
      createQuizForm.querySelector("button[type='submit']").textContent =
        "Submit Quiz";
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });
}

// ------------------------
// Load all quizzes
// ------------------------
async function loadAdminQuizzes() {
  if (!quizTableBody) return;

  try {
    const res = await fetch(`${BASE_URL}/quizzes`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });
    const quizzes = await res.json();
    quizTableBody.innerHTML = "";
    quizzes.forEach(addQuizRow);
  } catch (err) {
    console.error("Error loading quizzes:", err);
  }
}

// ------------------------
// Add single row
// ------------------------
function addQuizRow(quiz) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${quiz.question}</td>
    <td>${quiz.options.join(", ")}</td>
    <td>${quiz.correct_answer}</td>
    <td>${(quiz.tags || []).join(", ")}</td>
    <td>
      <button class="edit-btn" data-id="${quiz.id}">Edit</button>
      <button class="delete-btn" data-id="${quiz.id}">Delete</button>
    </td>
  `;
  quizTableBody.appendChild(tr);

  // Attach actions
  tr.querySelector(".edit-btn").onclick = () => editQuiz(quiz);
  tr.querySelector(".delete-btn").onclick = () => deleteQuiz(quiz.id);
}

// ------------------------
// Edit quiz
// ------------------------
function editQuiz(quiz) {
  if (!createQuizForm) return;

  document.getElementById("quiz-question-input").value = quiz.question;
  document.getElementById("quiz-options-input").value = quiz.options.join(", ");
  document.getElementById("quiz-correct-input").value = quiz.correct_answer;
  document.getElementById("quiz-tags-input").value = (quiz.tags || []).join(
    ", "
  );

  createQuizForm.dataset.editingId = quiz.id;
  createQuizForm.querySelector("button[type='submit']").textContent =
    "Update Quiz";
}

// ------------------------
// Delete quiz
// ------------------------
async function deleteQuiz(quizId) {
  if (!confirm("Are you sure?")) return;

  try {
    const res = await fetch(`${BASE_URL}/quizzes/${quizId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${Session.token()}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    const row = quizTableBody
      .querySelector(`button[data-id="${quizId}"]`)
      ?.closest("tr");
    if (row) row.remove();

    alert("Quiz deleted!");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// ------------------
// Leaderboard & Community
// ------------------
export async function loadLeaderboard() {
  const tableBody = document.getElementById("leaderboard-body");
  if (!tableBody) return;

  tableBody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

  try {
    const res = await fetch(`${BASE_URL}/leaderboard`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });

    if (!res.ok) throw new Error("Failed to fetch leaderboard");
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tableBody.innerHTML =
        "<tr><td colspan='5'>No leaderboard data available.</td></tr>";
      return;
    }

    tableBody.innerHTML = "";
    data.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.rank}</td>
        <td>${user.last_name}</td>
        <td>${user.xp}</td>
        <td>${user.level}</td>
        <td class="progress-bar-text">${user.progressBar} (${user.progress}%)</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    tableBody.innerHTML =
      "<tr><td colspan='5'>Failed to load leaderboard.</td></tr>";
  }
}

// Escape HTML to safely display code
function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Format post content: code blocks and inline code
function formatContent(text) {
  if (!text) return "";
  // Convert fenced code blocks ```code``` to div with class "post-code"
  text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<div class="post-code">${escapeHTML(code)}</div>`;
  });
  // Inline code `like this`
  text = text.replace(/`([^`]+)`/g, '<span class="post-code-inline">$1</span>');

  return text;
}

export async function loadQA() {
  try {
    const res = await fetch(`${BASE_URL}/qa/posts?type=question`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });

    if (!res.ok) throw new Error("Failed to fetch Q&A posts");
    const posts = await res.json();
    // Render header + Add Quiz button + form container
    communityQASection.innerHTML = `
      <div class="qa-header" style="margin-bottom: 1rem">
        <h3>Q&A</h3>
        <button id="add-quiz-btn" class="submit-btn" style="margin-left: 1rem">
          ➕ Add Quiz
        </button>
      </div>

      <div id="quiz-creation-form" style="display: none; margin-bottom: 1.5rem;">
        <form id="create-quiz-form" class="quiz-form">
          <textarea 
            name="question" 
            placeholder="Enter your quiz question..." 
            required 
            class="quiz-textarea"
            style="display:block; margin-bottom:8px; width:100%; padding:8px;"
          ></textarea>

          <!-- Single input for all options, comma-separated -->
          <input 
            type="text" 
            name="options" 
            placeholder="Enter options separated by commas, e.g., 6,7,11,5" 
            required 
            class="quiz-input"
            style="display:block; margin-bottom:8px; width:100%; padding:8px;"
          />

          <input 
            type="text" 
            name="correct_answer" 
            placeholder="Correct Answer" 
            required 
            class="quiz-input"
            style="display:block; margin-bottom:8px; width:100%; padding:8px;"
          />

          <input 
            type="text" 
            name="tags" 
            placeholder="Tags (comma-separated)" 
            class="quiz-input"
            style="display:block; margin-bottom:8px; width:100%; padding:8px;"
          />

          <button type="submit" class="submit-btn">Submit Quiz</button>
        </form>
      </div>
    `;

    // Toggle Add Quiz form
    const addQuizBtn = document.getElementById("add-quiz-btn");
    const quizFormContainer = document.getElementById("quiz-creation-form");
    const quizForm = document.getElementById("create-quiz-form");

    if (addQuizBtn) {
      addQuizBtn.addEventListener("click", () => {
        quizFormContainer.style.display =
          quizFormContainer.style.display === "none" ? "block" : "none";
        console.log("Add Quiz button clicked!");
      });
    }

    // Handle quiz form submission
    if (quizForm) {
      quizForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(quizForm);

        const question = formData.get("question").trim();
        const optionsInput = formData.get("options").trim();
        const options = optionsInput
          ? optionsInput.split(",").map((opt) => opt.trim())
          : [];
        const correct_answer = formData.get("correct_answer").trim();
        const tags = formData.get("tags")
          ? formData
              .get("tags")
              .split(",")
              .map((tag) => tag.trim())
          : [];

        if (!question || options.length === 0 || !correct_answer)
          return alert("Please fill out all required fields.");

        try {
          const res = await fetch(`${BASE_URL}/quizzes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Session.token()}`,
            },
            body: JSON.stringify({
              question,
              options,
              correct_answer,
              tags,
            }),
          });

          if (!res.ok) throw new Error("Failed to create quiz question");

          alert("Quiz question added successfully!");
          quizForm.reset();
          quizFormContainer.style.display = "none";

          // Reload Q&A posts
          await loadQA();
        } catch (err) {
          console.error("Quiz submission failed:", err);
          alert("Failed to add quiz. Please try again.");
        }
      });
    }

    // Render existing posts
    for (const post of posts) {
      const postDiv = document.createElement("div");
      postDiv.className = "qa-post";
      postDiv.dataset.id = post.id;

      postDiv.innerHTML = `
        <div class="qa-card">
          <div class="qa-header">
            <h4 class="qa-title">${post.title || "Untitled Question"}</h4>
            <p class="qa-body">${formatContent(post.body)}</p>
          </div>

          <div class="qa-meta">
            <span class="qa-author">👤 ${post.username || "Anonymous"}</span>
            <span class="qa-date">🕒 ${new Date(
              post.created_at
            ).toLocaleString()}</span>
          </div>

          <div class="qa-answers" id="answers-${post.id}">
            <p>Loading answers...</p>
          </div>

          <form class="answer-form" data-id="${post.id}">
            <div class="answer-input-group">
              <textarea class="answer-textarea" name="answer" placeholder="💬 Write your answer..." rows="4" required></textarea>
              <button type="submit" class="answer-submit">Submit</button>
            </div>
          </form>

          <div class="qa-actions"></div>
        </div>
      `;

      if (Session.user().role === "admin") {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-post-btn";
        deleteBtn.addEventListener("click", () => deletePost(post.id, postDiv));
        postDiv.querySelector(".qa-actions").appendChild(deleteBtn);
      }

      communityQASection.appendChild(postDiv);

      await loadAnswersIntoDOM(post.id);

      const answerForm = postDiv.querySelector(".answer-form");
      const textarea = postDiv.querySelector(".answer-textarea");

      answerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = textarea.value.trim();
        if (!content) return alert("Please write your answer");

        try {
          const res = await fetch(`${BASE_URL}/qa/answers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Session.token()}`,
            },
            body: JSON.stringify({ postId: post.id, content }),
          });

          if (!res.ok) throw new Error("Failed to submit answer");

          textarea.value = "";
          await loadAnswersIntoDOM(post.id);
        } catch (err) {
          console.error("Answer submission failed:", err);
          alert("Failed to submit your answer.");
        }
      });
    }
  } catch (err) {
    console.error("Error loading Q&A:", err);
    communityQASection.innerHTML =
      "<h3>Q&A</h3><p>Failed to load questions. Try again later.</p>";
  }
}

// deleting the question or post by the admin

async function deletePost(postId, postDiv) {
  if (!confirm("Are you sure you want to delete this post?")) return;

  try {
    const res = await fetch(`${BASE_URL}/qa/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${Session.token()}` },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to delete post");
    }

    postDiv.remove();
    alert("Post deleted successfully");
  } catch (err) {
    console.error("Delete post failed:", err);
    alert(`Failed to delete post: ${err.message}`);
  }
}

// Load answers into DOM
async function loadAnswersIntoDOM(postId) {
  // 1️⃣ Grab the answers container
  const answersWrapper = document.getElementById(`answers-${postId}`);
  if (!answersWrapper) {
    console.warn(`Answers container not found for post ${postId}`);
    return; // exit early if container is missing
  }

  // 2️⃣ Show loading state
  answersWrapper.innerHTML = "<p>Loading...</p>";

  try {
    // 3️⃣ Fetch answers
    const answers = await fetchAnswers(postId);

    // 4️⃣ No answers yet
    if (!answers || answers.length === 0) {
      answersWrapper.innerHTML = `
        <div class="no-answers-message">
          <p>📝 No answers yet. <strong>Be the first to contribute!</strong></p>
        </div>
      `;
      return;
    }

    // 5️⃣ Clear previous content
    answersWrapper.innerHTML = "";

    // 6️⃣ Render each answer
    answers.forEach((answer) => {
      const div = document.createElement("div");
      div.className = "answer";
      div.innerHTML = `
        <p>${formatContent(answer.content)}</p>
        <div class="meta">
          <span class="author">By ${answer.author_name || "Anonymous"}</span>
          <span class="date">${new Date(
            answer.created_at
          ).toLocaleString()}</span>
        </div>
      `;
      answersWrapper.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading answers:", err);
    answersWrapper.innerHTML = "<p>Failed to load answers.</p>";
  }
}

// for submitting the question

if (submitForm) {
  submitForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const type = "question"; // default type for QA

    if (!title || !body) {
      return alert("Please provide both a title and body for your question.");
    }

    try {
      const res = await fetch(`${BASE_URL}/qa/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Session.token()}`,
        },
        body: JSON.stringify({ title, body, type }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit question");
      }

      titleInput.value = "";
      bodyInput.value = "";
      if (submitSection) submitSection.style.display = "none";
      await loadQA(); // Refresh the Q&A section
    } catch (err) {
      console.error("Submit question failed:", err);
      alert(`Failed to submit your question: ${err.message}`);
    }
  });
}

if (cancelQuestionBtn) {
  cancelQuestionBtn.addEventListener("click", () => {
    if (submitSection) submitSection.style.display = "none";
  });
}

export async function fetchAnswers(postId) {
  try {
    const res = await fetch(`${BASE_URL}/qa/answers/${postId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch answers");
    return await res.json();
  } catch (err) {
    console.error("Error loading answers:", err);
    return [];
  }
}

// loading admin created posts

export async function loadAdminPosts() {
  const adminPostsSection = document.querySelector("#admin-posts-container");

  if (!adminPostsSection) {
    console.warn("Admin posts container not found. Skipping loadAdminPosts.");
    return;
  }

  adminPostsSection.innerHTML = "<p>Loading admin posts...</p>";

  try {
    const res = await fetch(`${BASE_URL}/qa/posts/admin`, {
      headers: { Authorization: `Bearer ${Session.token()}` },
    });

    if (!res.ok) throw new Error("Failed to fetch admin posts");
    const posts = await res.json();

    adminPostsSection.innerHTML = "";

    if (!posts.length) {
      adminPostsSection.innerHTML =
        "<p>No admin posts yet. Check back soon!</p>";
      return;
    }

    for (const post of posts) {
      const postDiv = document.createElement("div");
      postDiv.className = "qa-post";
      postDiv.dataset.id = post.id;

      postDiv.innerHTML = `
        <div class="qa-card">
          <div class="qa-header">
            <h4 class="qa-title">${post.title || "Untitled Post"}</h4>
            <p class="qa-body">${formatContent(post.body)}</p>
          </div>

          <div class="qa-meta">
            <span class="qa-author">👤 ${post.author_name || "Admin"}</span>
            <span class="qa-date">🕒 ${new Date(
              post.created_at
            ).toLocaleString()}</span>
          </div>

          <div class="qa-answers" id="answers-${post.id}">
            <p>Loading answers...</p>
          </div>

          <form class="answer-form" data-id="${post.id}">
            <div class="answer-input-group">
              <textarea class="answer-textarea" name="answer" placeholder="💬 Write your answer..." rows="4" required></textarea>
              <button type="submit" class="answer-submit">Submit</button>
            </div>
          </form>

          <div class="qa-actions"></div>
        </div>
      `;

      if (Session.user()?.role === "admin") {
        const actionsDiv = postDiv.querySelector(".qa-actions");

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-post-btn";
        deleteBtn.addEventListener("click", () => deletePost(post.id, postDiv));
        actionsDiv.appendChild(deleteBtn);

        // Approve button
        const approveBtn = document.createElement("button");
        approveBtn.textContent = "Approve";
        approveBtn.className = "approve-post-btn";
        approveBtn.addEventListener("click", () =>
          updatePostStatus(post.id, "approved", postDiv)
        );
        actionsDiv.appendChild(approveBtn);

        // Reject button
        const rejectBtn = document.createElement("button");
        rejectBtn.textContent = "Reject";
        rejectBtn.className = "reject-post-btn";
        rejectBtn.addEventListener("click", () =>
          updatePostStatus(post.id, "rejected", postDiv)
        );
        actionsDiv.appendChild(rejectBtn);
      }

      adminPostsSection.appendChild(postDiv);

      await loadAnswersIntoDOM(post.id);

      // Answer form submission
      const answerForm = postDiv.querySelector(".answer-form");
      const textarea = postDiv.querySelector(".answer-textarea");

      if (answerForm && textarea) {
        const freshForm = answerForm.cloneNode(true);
        answerForm.replaceWith(freshForm);
        const freshTextarea = freshForm.querySelector(".answer-textarea");

        freshForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const content = freshTextarea.value.trim();
          if (!content) return alert("Please write your answer");

          try {
            const res = await fetch(`${BASE_URL}/qa/answers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Session.token()}`,
              },
              body: JSON.stringify({ postId: post.id, content }),
            });

            if (!res.ok) throw new Error("Failed to submit answer");

            freshTextarea.value = "";
            await loadAnswersIntoDOM(post.id);
          } catch (err) {
            console.error("Answer submission failed:", err);
            alert("Failed to submit your answer.");
          }
        });
      }
    }
  } catch (err) {
    console.error("Error loading admin posts:", err);
    adminPostsSection.innerHTML =
      "<p>Failed to load admin posts. Try again later.</p>";
  }
}

// ----------------------------
// Helper: Update Post Status
// ----------------------------
async function updatePostStatus(postId, status, postDiv) {
  let reason = "";

  // Ask for reason if rejecting
  if (status === "rejected") {
    reason = prompt("Please provide a reason for rejection:");
    if (!reason) {
      alert("Rejection reason is required.");
      return;
    }
  }

  if (!confirm(`Are you sure you want to ${status} this post?`)) return;

  try {
    const res = await fetch(`${BASE_URL}/qa/posts/${postId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
      body: JSON.stringify({ status, reason }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Failed to ${status} post`);
    }

    alert(`Post ${status} successfully!`);
    postDiv.remove(); // remove it from the admin list after action
  } catch (err) {
    console.error("Error updating post status:", err);
    alert(`Failed to ${status} post: ${err.message}`);
  }
}

function appendMessage(role, message) {
  const div = document.createElement("div");
  div.className = `ai-message ${role}`;
  div.textContent = message;
  aiChatBox.appendChild(div);
  aiChatBox.scrollTop = aiChatBox.scrollHeight;
}

export async function loadAI() {
  if (!aiForm || !aiInput || !aiChatBox) return;

  // Optional: Reset chat UI
  aiChatBox.innerHTML = `
    <div class="ai-message system">
      👋 Hi! I'm CodePal. Ask me anything about coding, puzzles, or debugging.
    </div>
  `;

  // ✅ Prevent double binding
  if (!aiForm.dataset.bound) {
    aiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userInput = aiInput.value.trim();
      if (!userInput) return;

      appendMessage("user", userInput);
      aiInput.value = "";

      try {
        const res = await fetch(`${BASE_URL}/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Session.token()}`,
          },
          body: JSON.stringify({ prompt: userInput }),
        });

        const data = await res.json();
        appendMessage("system", data.reply || "No response from AI.");
      } catch (err) {
        console.error("AI error:", err);
        appendMessage("system", "⚠️ Failed to get response from AI.");
      }
    });

    // Mark as bound
    aiForm.dataset.bound = "true";
  }

  // ✅ Prevent multiple quick prompt listeners
  aiQuickButtons.forEach((btn) => {
    if (!btn.dataset.bound) {
      btn.addEventListener("click", () => {
        aiInput.value = btn.textContent;
        aiInput.focus();
      });
      btn.dataset.bound = "true";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // 1️⃣ Tab navigation (Q&A, Puzzles, Badges)
  const tabs = document.querySelectorAll(".community-tab");
  const sections = document.querySelectorAll(".community-section");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      sections.forEach((section) => {
        section.classList.remove("active");
        if (section.id === target) section.classList.add("active");
      });
    });
  });

  // 2️⃣ Quiz form toggle
  const addQuizBtn = document.getElementById("add-quiz-btn");
  const quizFormWrapper = document.getElementById("quiz-creation-form");

  if (addQuizBtn && quizFormWrapper) {
    addQuizBtn.addEventListener("click", () => {
      quizFormWrapper.style.display =
        quizFormWrapper.style.display === "none" ? "block" : "none";
    });
  }

  // 3️⃣ Quiz form submission
  const createQuizForm = document.getElementById("create-quiz-form");

  if (createQuizForm) {
    createQuizForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = createQuizForm.querySelector("#quiz-title").value;
      const description =
        createQuizForm.querySelector("#quiz-description").value;

      if (!title || !description) {
        alert("Please fill in all fields.");
        return;
      }

      try {
        const res = await fetch("/api/quizzes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Session.token()}`,
          },
          body: JSON.stringify({ title, description }),
        });

        if (!res.ok) throw new Error("Failed to create quiz");

        const quiz = await res.json();
        alert(`Quiz "${quiz.title}" created successfully!`);

        // Reset form
        createQuizForm.reset();
        quizFormWrapper.style.display = "none";
      } catch (err) {
        console.error(err);
        alert("Error creating quiz. See console for details.");
      }
    });
  }
});

// fetch pending posts
const loadPendingPosts = async () => {
  try {
    const res = await fetch(`${BASE_URL}/qa/posts?status=pending`, {
      headers: { Authorization: "Bearer " + Session.token() },
    });

    if (!res.ok) throw new Error("Failed to fetch pending posts");

    const posts = await res.json();
    const container = document.getElementById("pending-posts-container");

    if (!container) return;

    container.innerHTML = "";

    posts.forEach((post) => {
      const div = document.createElement("div");
      div.className = "pending-post";
      div.dataset.id = post.id;

      div.innerHTML = `
        <h3>${post.title}</h3>
        <p>${post.body}</p>
        <p>Status: ${post.status}</p>
      `;

      if (post.status === "pending") {
        const approveBtn = document.createElement("button");
        approveBtn.textContent = "Approve";
        approveBtn.addEventListener("click", () => approvePost(post.id, div));

        const rejectBtn = document.createElement("button");
        rejectBtn.textContent = "Reject";
        rejectBtn.addEventListener("click", () => rejectPost(post.id, div));

        div.appendChild(approveBtn);
        div.appendChild(rejectBtn);
      }

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading pending posts:", err);
  }
};

// approve the posts

async function approvePost(postId, postDiv) {
  if (!confirm("Approve this post?")) return;

  try {
    const res = await fetch(`${BASE_URL}/qa/posts/${postId}/approve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to approve post");
    }

    // Remove post from DOM
    if (postDiv) postDiv.remove();
    alert("Post approved successfully!");
  } catch (err) {
    console.error("Error approving post:", err);
    alert(`Error approving post: ${err.message}`);
  }
}

// Reject a pending post with reason
async function rejectPost(postId, postDiv) {
  // Ask for reason
  const reason = prompt("Please provide a reason for rejection:");
  if (!reason) {
    alert("Rejection reason is required.");
    return;
  }

  if (!confirm(`Reject this post for reason: "${reason}"?`)) return;

  try {
    const res = await fetch(`${BASE_URL}/qa/posts/${postId}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Session.token()}`,
      },
      body: JSON.stringify({ reason }), // send reason to server
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to reject post");
    }

    // Remove post from DOM
    if (postDiv) postDiv.remove();
    alert("Post rejected successfully!");
  } catch (err) {
    console.error("Error rejecting post:", err);
    alert(`Error rejecting post: ${err.message}`);
  }
}

// Load all community content
export async function loadCommunitySection() {
  try {
    await Promise.all([
      loadLeaderboard(),
      loadUserQuizzes(),
      loadAdminQuizzes(),
      loadQA(),
      loadAdminPosts(),
      loadAI(),
      loadPendingPosts(),
    ]);
    console.log("Community content loaded.");
  } catch (err) {
    console.error("Error loading community:", err);
  }
}
