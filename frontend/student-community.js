import { Session } from "./session.js";
import { BASE_URL } from "./config.js";

// ==============================
// Utility to fetch with auth token
// ==============================

const fetchWithAuth = async (url, options = {}) => {
  const token = Session.token();
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

// ==============================
// Load all community posts (Q&A)
// ==============================
export const loadCommunityPosts = async () => {
  try {
    const posts = await fetchWithAuth(`${BASE_URL}/student/community/posts`);
    const postsContainer = document.getElementById("community-qa-posts");
    postsContainer.innerHTML = "";

    // ===== USER INFO =====
    const token = Session.token();
    let currentUserId = null;
    let isAdmin = false;
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.userId || payload.id;
      isAdmin = payload.role === "admin";
    }

    // ===== FILTER POSTS =====
    const visiblePosts = posts.filter(
      (post) =>
        isAdmin || post.status === "approved" || post.user_id === currentUserId
    );

    for (const post of visiblePosts) {
      const postDiv = document.createElement("div");
      postDiv.classList.add("qa-card");
      postDiv.id = `post-card-${post.id}`;

      // ===== STATUS LABELS =====
      let statusLabel = "";
      if (post.status === "pending") {
        statusLabel = `<span class="post-status pending">⏳ Pending approval</span>`;
      } else if (post.status === "rejected") {
        statusLabel = `<span class="post-status rejected">❌ Rejected${
          post.rejection_reason ? `: ${post.rejection_reason}` : ""
        }</span>`;
      }

      // ===== POST HTML =====
      postDiv.innerHTML = `
        <h4 class="qa-title">${escapeHTML(post.title)}</h4>
        <p>${escapeHTML(post.body)}</p>
        ${statusLabel}

        <div class="qa-meta">
          <span class="qa-author">
            ${(post.first_name || "") + " " + (post.last_name || "")}
          </span>
          <span class="qa-date">${new Date(post.created_at).toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>

        <div class="qa-actions">
          <button id="view-btn-${post.id}">View Answers</button>
          <textarea id="answer-input-${
            post.id
          }" placeholder="Your answer" rows="5"></textarea>
          <button id="submit-btn-${post.id}">Submit</button>
        </div>

        <div id="answers-${post.id}" class="answers-section"></div>

        ${
          isAdmin || currentUserId === post.user_id
            ? `<div class="post-actions">
                 <button class="edit-post-btn" data-post-id="${post.id}">✏️ Edit</button>
                 <button class="delete-post-btn" data-post-id="${post.id}">🗑️ Delete</button>
               </div>`
            : ""
        }
      `;

      postsContainer.appendChild(postDiv);

      // ===== REJECTED POST RESUBMIT =====
      if (post.status === "rejected") {
        const resubmitBtn = document.createElement("button");
        resubmitBtn.textContent = "Resubmit";
        resubmitBtn.className = "resubmit-btn";
        resubmitBtn.style.marginTop = "0.5rem";

        resubmitBtn.addEventListener("click", async () => {
          const newTitle = prompt("Edit post title:", post.title);
          if (!newTitle) return;

          const newBody = prompt("Edit post body:", post.body);
          if (!newBody) return;

          try {
            const response = await fetchWithAuth(
              `${BASE_URL}/student/community/posts/${post.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: newTitle,
                  body: newBody,
                  status: "pending",
                }),
              }
            );

            // Parse the JSON response
            const data = await response.json();

            // Check if the request was successful
            if (!response.ok) {
              alert(
                `❌ Failed to resubmit post: ${data.error || "Unknown error"}`
              );
              return;
            }

            // Remove the post from the DOM
            postDiv.remove();

            alert("✅ Post resubmitted for approval!");
          } catch (err) {
            console.error("Error resubmitting post:", err);
            alert("❌ Failed to resubmit post due to network or server error.");
          }
        });

        postDiv.appendChild(resubmitBtn);
      }

      // ===== DISABLE ANSWERS IF NOT APPROVED =====
      const submitBtn = postDiv.querySelector(`#submit-btn-${post.id}`);
      const answerInput = postDiv.querySelector(`#answer-input-${post.id}`);
      if (post.status !== "approved") {
        submitBtn.disabled = true;
        answerInput.placeholder = "Cannot answer until post is approved";
      } else {
        submitBtn.addEventListener("click", () => submitAnswer(post.id));
      }

      // ===== VIEW ANSWERS =====
      const viewBtn = postDiv.querySelector(`#view-btn-${post.id}`);
      const answersDiv = postDiv.querySelector(`#answers-${post.id}`);

      viewBtn.addEventListener("click", async () => {
        if (answersDiv.style.display === "block") {
          answersDiv.style.display = "none";
          viewBtn.textContent = "View Answers";
          return;
        }

        answersDiv.innerHTML = `<div class="loader"></div>`;
        viewBtn.textContent = "Loading...";

        try {
          const answers = await fetchWithAuth(
            `${BASE_URL}/student/community/posts/${post.id}/answers`
          );

          if (!answers.length) {
            answersDiv.innerHTML = `<p style="text-align:center; color:#aaa;">No answers yet.</p>`;
          } else {
            answersDiv.innerHTML = answers
              .map(
                (ans) => `
                <div class="answer-card" id="answer-card-${
                  ans.id
                }" data-author-id="${ans.user_id}">
                  <p>${ans.answer}</p>
                  <div class="qa-meta">
                    <span class="qa-author">${
                      (ans.first_name || "") + " " + (ans.last_name || "")
                    }</span>
                    <span class="qa-date">${new Date(
                      ans.created_at
                    ).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</span>
                  </div>

                  <div class="answer-reactions">
                    <button class="reaction-btn" data-answer-id="${
                      ans.id
                    }" data-type="like">
                      👍 <span id="like-count-${ans.id}">${
                  ans.likes ?? 0
                }</span>
                    </button>
                    <button class="reaction-btn" data-answer-id="${
                      ans.id
                    }" data-type="dislike">
                      👎 <span id="dislike-count-${ans.id}">${
                  ans.dislikes ?? 0
                }</span>
                    </button>
                    <button class="comment-btn" data-answer-id="${
                      ans.id
                    }" data-author-id="${ans.user_id}">
                      💬 Comments
                    </button>
                  </div>

                  <div id="comments-${ans.id}" class="comments-section"></div>
                </div>
              `
              )
              .join("");

            // ===== REACTIONS =====
            answersDiv.querySelectorAll(".reaction-btn").forEach((btn) => {
              btn.addEventListener("click", async () => {
                const answerId = btn.dataset.answerId;
                const type = btn.dataset.type;

                try {
                  const data = await fetchWithAuth(
                    `${BASE_URL}/answer-reactions/${answerId}`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reaction_type: type }),
                    }
                  );

                  // Update DOM counts
                  document.getElementById(
                    `like-count-${answerId}`
                  ).textContent = data.likes;
                  document.getElementById(
                    `dislike-count-${answerId}`
                  ).textContent = data.dislikes;
                } catch (err) {
                  console.error("Error reacting:", err);
                  alert(err.message || "Failed to react");
                }
              });
            });

            // ===== COMMENTS =====
            answersDiv.querySelectorAll(".comment-btn").forEach((btn) => {
              btn.addEventListener("click", () => {
                const answerId = btn.dataset.answerId;
                const authorId = btn.dataset.authorId;
                loadAnswerComments(answerId, authorId);
              });
            });
          }

          answersDiv.style.display = "block";
          viewBtn.textContent = "Hide Answers";
        } catch (err) {
          console.error("Error loading answers:", err);
          answersDiv.innerHTML = `<p style="color:red;">Failed to load answers.</p>`;
          viewBtn.textContent = "View Answers";
        }
      });

      // ===== EDIT & DELETE =====
      if (isAdmin || currentUserId === post.user_id) {
        const editBtn = postDiv.querySelector(".edit-post-btn");
        const deleteBtn = postDiv.querySelector(".delete-post-btn");

        editBtn?.addEventListener("click", async () => {
          const newTitle = prompt("Edit title:", post.title);
          const newBody = prompt("Edit body:", post.body);
          if (!newTitle || !newBody) return;

          try {
            await fetchWithAuth(
              `${BASE_URL}/student/community/posts/${post.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle, body: newBody }),
              }
            );
            alert("Post updated!");
            await loadCommunityPosts();
          } catch (err) {
            console.error("Error updating:", err);
          }
        });

        deleteBtn?.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this post?")) return;
          try {
            await fetchWithAuth(
              `${BASE_URL}/student/community/posts/${post.id}`,
              { method: "DELETE" }
            );
            postDiv.remove();
            alert("Deleted successfully!");
          } catch (err) {
            console.error("Error deleting:", err);
          }
        });
      }
    }
  } catch (err) {
    console.error("Error loading community posts:", err);
  }
};

/**
 * Load and display comments for a specific answer (with nested replies)
 */
export const loadAnswerComments = async (answerId, answerAuthorId) => {
  const commentsDiv = document.getElementById(`comments-${answerId}`);
  if (!commentsDiv) return;

  commentsDiv.innerHTML = `<div class="loader"></div>`;

  try {
    const data = await fetchWithAuth(
      `${BASE_URL}/answer-reactions/${answerId}`
    );
    const comments = data.comments || [];

    // Recursive renderer for nested comments
    const renderComments = (comments, level = 0) => {
      return comments
        .map(
          (comment) => `
            <div class="comment" style="margin-left:${
              level * 1.2
            }rem; border-left:1px solid #ccc; padding-left:0.5rem; margin-top:0.4rem;">
              <p><b>${comment.full_name}</b>: ${escapeHTML(comment.comment)}</p>
              <small style="color:gray;">${new Date(
                comment.created_at
              ).toLocaleString()}</small>
              <div class="comment-actions" style="margin-top:0.3rem;">
                <button class="reply-btn" data-comment-id="${
                  comment.id
                }" data-answer-id="${answerId}">
                  ↩ Reply
                </button>
              </div>
              ${
                comment.replies && comment.replies.length
                  ? renderComments(comment.replies, level + 1)
                  : ""
              }
            </div>
          `
        )
        .join("");
    };

    // Comments HTML
    let commentsHTML =
      comments.length > 0
        ? renderComments(comments)
        : `<p style="color:#777; text-align:center;">No comments yet.</p>`;

    // Root comment input
    commentsHTML += `
      <div class="root-comment-box" style="margin-top:1rem;">
        <textarea id="new-comment-${answerId}" placeholder="Write a comment..." rows="2" style="width:100%;"></textarea>
        <button id="post-comment-${answerId}" class="post-comment-btn" style="margin-top:0.4rem;">💬 Post Comment</button>
      </div>
    `;

    commentsDiv.innerHTML = commentsHTML;

    // Bind reply events
    commentsDiv.querySelectorAll(".reply-btn").forEach((btn) => {
      btn.addEventListener("click", () => showReplyBox(btn, answerAuthorId));
    });

    // Bind root comment event
    const postCommentBtn = document.getElementById(`post-comment-${answerId}`);
    const commentInput = document.getElementById(`new-comment-${answerId}`);

    if (postCommentBtn) {
      postCommentBtn.addEventListener("click", async () => {
        const text = commentInput.value.trim();
        if (!text) return;

        try {
          await fetchWithAuth(`${BASE_URL}/answer-reactions/${answerId}`, {
            method: "POST",
            body: JSON.stringify({
              comment: text,
              parent_comment_id: null,
            }),
          });

          commentInput.value = "";
          await loadAnswerComments(answerId, answerAuthorId);
        } catch (err) {
          console.error("Error posting comment:", err);
          alert("❌ Failed to post comment.");
        }
      });
    }
  } catch (err) {
    console.error("Error loading comments:", err);
    commentsDiv.innerHTML = `<p style="color:red;">Failed to load comments.</p>`;
  }
};

// Helper: reply box
const showReplyBox = (btn, answerAuthorId) => {
  const parentId = btn.dataset.commentId;
  const answerId = btn.dataset.answerId;

  if (
    btn.nextElementSibling &&
    btn.nextElementSibling.classList.contains("reply-box")
  )
    return;

  const replyBox = document.createElement("div");
  replyBox.classList.add("reply-box");
  replyBox.style.marginTop = "0.5rem";
  replyBox.innerHTML = `
    <textarea class="reply-input" placeholder="Write your reply..." rows="2" style="width:100%;"></textarea>
    <button class="send-reply-btn" style="margin-top:0.3rem;">Send</button>
  `;

  btn.insertAdjacentElement("afterend", replyBox);

  const sendBtn = replyBox.querySelector(".send-reply-btn");
  sendBtn.addEventListener("click", async () => {
    const replyText = replyBox.querySelector(".reply-input").value.trim();
    if (!replyText) return;

    try {
      await fetchWithAuth(`${BASE_URL}/answer-reactions/${answerId}`, {
        method: "POST",
        body: JSON.stringify({
          comment: replyText,
          parent_comment_id: parentId,
        }),
      });

      replyBox.remove();
      await loadAnswerComments(answerId, answerAuthorId);
    } catch (err) {
      console.error("Error submitting reply:", err);
      alert("❌ Failed to submit reply.");
    }
  });
};

// Handles both loader and toggle behavior
window.loadAnswers = async (postId, event) => {
  const button = event.currentTarget;
  const answersDiv = document.getElementById(`answers-${postId}`);

  if (answersDiv.dataset.open === "true") {
    answersDiv.innerHTML = "";
    answersDiv.dataset.open = "false";
    button.textContent = "View Answers";
    return;
  }

  answersDiv.innerHTML = `<div class="loader"></div>`;
  answersDiv.dataset.open = "true";
  button.textContent = "Loading...";

  // ===== Get current user info =====
  const token = Session.token();
  let currentUserId = null;
  let isAdmin = false;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.userId || payload.id;
      isAdmin = payload.role === "admin";
    } catch {}
  }

  try {
    const answers = await fetchWithAuth(
      `${BASE_URL}/student/community/posts/${postId}/answers`
    );

    if (!answers || answers.length === 0) {
      answersDiv.innerHTML = `<p style="text-align:center; color:#aaa;">No answers yet.</p>`;
    } else {
      answersDiv.innerHTML = answers
        .map((ans) => {
          const canEditDelete = currentUserId === ans.user_id || isAdmin;
          const authorName =
            (ans.first_name || "") + " " + (ans.last_name || "") ||
            ans.username ||
            "Anonymous";
          return `
          <div class="answer-card" id="answer-card-${ans.id}" data-author-id="${
            ans.user_id
          }">
            <p><strong>${escapeHTML(authorName)}:</strong> ${escapeHTML(
            ans.body
          )}</p>
            <div class="qa-meta">
              <span class="qa-date">${new Date(ans.created_at).toLocaleString(
                [],
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}</span>
            </div>
            <div class="answer-reactions">
              <button class="reaction-btn" data-answer-id="${
                ans.id
              }" data-type="like">👍</button>
              <button class="reaction-btn" data-answer-id="${
                ans.id
              }" data-type="dislike">👎</button>
              <button class="comment-btn" data-answer-id="${
                ans.id
              }" data-author-id="${ans.user_id}">💬 Comment</button>
            </div>
            ${
              canEditDelete
                ? `<div class="answer-actions">
                     <button class="edit-answer-btn" data-answer-id="${ans.id}">✏️ Edit</button>
                     <button class="delete-answer-btn" data-answer-id="${ans.id}">🗑️ Delete</button>
                   </div>`
                : ""
            }
            <div id="comments-${ans.id}" class="comments-section"></div>
          </div>`;
        })
        .join("");

      // === Bind reactions ===
      answersDiv.querySelectorAll(".reaction-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const answerId = btn.dataset.answerId;
          const type = btn.dataset.type;
          try {
            await fetchWithAuth(
              `${BASE_URL}/student/community/answer-reactions/${answerId}`,
              {
                method: "POST",
                body: JSON.stringify({ type }),
              }
            );
          } catch (err) {
            console.error("Error reacting:", err);
          }
        });
      });

      // === Bind comments ===
      answersDiv.querySelectorAll(".comment-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const answerId = btn.dataset.answerId;
          const authorId = btn.dataset.authorId;
          loadAnswerComments(answerId, authorId);
        });
      });

      // === Bind edit/delete ===
      answersDiv.querySelectorAll(".edit-answer-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const answerId = btn.dataset.answerId;
          const answerP = document.querySelector(`#answer-card-${answerId} p`);
          const currentText = answerP.textContent.replace(/^.*?:\s/, "");
          const newAnswer = prompt("Edit your answer:", currentText);
          if (!newAnswer) return;
          try {
            await fetchWithAuth(
              `${BASE_URL}/student/community/answers/${answerId}`,
              {
                method: "PUT",
                body: JSON.stringify({ answer: newAnswer }),
              }
            );
            answerP.innerHTML = `<strong>${escapeHTML(
              currentUserId
            )}:</strong> ${escapeHTML(newAnswer)}`;
            alert("Answer updated!");
          } catch (err) {
            console.error("Error updating answer:", err);
            alert("Failed to update answer.");
          }
        });
      });

      answersDiv.querySelectorAll(".delete-answer-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this answer?")) return;
          const answerId = btn.dataset.answerId;
          try {
            await fetchWithAuth(
              `${BASE_URL}/student/community/answers/${answerId}`,
              { method: "DELETE" }
            );
            document.getElementById(`answer-card-${answerId}`).remove();
            alert("Answer deleted!");
          } catch (err) {
            console.error("Error deleting answer:", err);
            alert("Failed to delete answer.");
          }
        });
      });
    }

    button.textContent = "Hide Answers";
  } catch (err) {
    console.error("Error loading answers:", err);
    answersDiv.innerHTML = `<p style="color:red; text-align:center;">Failed to load answers.</p>`;
    button.textContent = "View Answers";
  }
};

// Initialize Ask Question button + form logic
export const setupAskQuestionFeature = () => {
  const askBtn = document.getElementById("ask-question-btn");
  const formSection = document.getElementById("submit-question-section");
  const form = document.getElementById("submit-question-form");
  const cancelBtn = document.getElementById("cancel-question");

  if (!askBtn || !form || !cancelBtn) {
    console.warn("Ask question elements missing in DOM");
    return;
  }

  // Show form when "Ask Question" clicked
  askBtn.addEventListener("click", () => {
    formSection.style.display = "block";
    askBtn.style.display = "none";
  });

  // Hide form when "Cancel" clicked
  cancelBtn.addEventListener("click", () => {
    formSection.style.display = "none";
    askBtn.style.display = "inline-block";
    form.reset();
  });

  // Handle question submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("question-title-input").value.trim();
    const body = document.getElementById("question-body-input").value.trim();

    if (!title || !body) return alert("Please fill out all fields.");

    try {
      const res = await fetchWithAuth(`${BASE_URL}/student/community/posts`, {
        method: "POST",
        body: JSON.stringify({ title, body, type: "question" }),
      });

      alert(res.message || "Question posted successfully!");
      form.reset();
      formSection.style.display = "none";
      askBtn.style.display = "inline-block";

      // Reload community posts
      await loadCommunityPosts();
    } catch (err) {
      console.error("Error submitting question:", err);
      alert("Failed to submit question. Please try again.");
    }
  });
};

// ==============================
// Submit an answer to a post
// ==============================
export const submitAnswer = async (postId) => {
  try {
    const answerInput = document.getElementById(`answer-input-${postId}`);
    const answer = escapeHTML(answerInput.value.trim());
    if (!answer) return alert("Please type an answer.");

    const res = await fetchWithAuth(`${BASE_URL}/student/community/answers`, {
      method: "POST",
      body: JSON.stringify({ post_id: postId, answer }),
    });

    alert(res.message);
    answerInput.value = "";
    loadAnswers(postId);
    loadLeaderboard();
  } catch (err) {
    console.error("Error submitting answer:", err);
  }
};

// ==============================
// Load answers for a post
// ==============================
export const loadAnswers = async (postId, event = null) => {
  const answersDiv = document.getElementById(`answers-${postId}`);
  let button = event?.currentTarget || null;

  // Toggle open/close if button is provided
  if (button && answersDiv.dataset.open === "true") {
    answersDiv.innerHTML = "";
    answersDiv.dataset.open = "false";
    button.textContent = "View Answers";
    return;
  }

  answersDiv.innerHTML = `<div class="loader"></div>`;
  if (button) {
    answersDiv.dataset.open = "true";
    button.textContent = "Loading...";
  }

  // ===== Get current user info =====
  const token = Session.token();
  let currentUserId = null;
  let isAdmin = false;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.id || payload.userId || payload.user_id || null;
      isAdmin = payload.role?.toLowerCase() === "admin";
    } catch (err) {
      console.error("Error parsing token:", err);
    }
  }

  try {
    // Fetch answers
    const answers = await fetchWithAuth(
      `${BASE_URL}/student/community/posts/${postId}/answers`
    );

    if (!answers || answers.length === 0) {
      answersDiv.innerHTML = `<p style="text-align:center; color:#aaa;">No answers yet.</p>`;
      if (button) button.textContent = "View Answers";
      return;
    }

    answersDiv.innerHTML = "";

    answers.forEach((ans) => {
      // ===== FIX: ensure IDs match strings and trim spaces =====
      const canEditDelete =
        (ans.user_id &&
          currentUserId?.toString().trim() ===
            ans.user_id?.toString().trim()) ||
        isAdmin;

      const authorName =
        (ans.first_name || "") + " " + (ans.last_name || "") ||
        ans.username ||
        "Anonymous";

      const answerCard = document.createElement("div");
      answerCard.classList.add("answer-card");
      answerCard.id = `answer-card-${ans.id}`;
      answerCard.dataset.authorId = ans.user_id;

      answerCard.innerHTML = `
        <p><strong>${escapeHTML(authorName)}:</strong> ${escapeHTML(
        ans.answer
      )}</p>
        <div class="qa-meta">
          <span class="qa-date">${new Date(ans.created_at).toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>
        <div class="answer-reactions">
          <button class="reaction-btn" data-answer-id="${
            ans.id
          }" data-type="like">
            👍 <span id="like-count-${ans.id}">${ans.likes ?? 0}</span>
          </button>
          <button class="reaction-btn" data-answer-id="${
            ans.id
          }" data-type="dislike">
            👎 <span id="dislike-count-${ans.id}">${ans.dislikes ?? 0}</span>
          </button>
          <button class="comment-btn" data-answer-id="${
            ans.id
          }" data-author-id="${ans.user_id}">
            💬 Comments
          </button>
        </div>
        <div id="comments-${ans.id}" class="comments-section"></div>
        ${
          canEditDelete
            ? `<div class="answer-actions">
                 <button class="edit-answer-btn" data-answer-id="${ans.id}">✏️ Edit Answer</button>
                 <button class="delete-answer-btn" data-answer-id="${ans.id}">🗑️ Delete Answer</button>
               </div>`
            : ""
        }
      `;

      answersDiv.appendChild(answerCard);

      // ===== Bind reactions =====
      answerCard.querySelectorAll(".reaction-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const answerId = btn.dataset.answerId;
          const type = btn.dataset.type;
          try {
            const data = await fetchWithAuth(
              `${BASE_URL}/student/community/answer-reactions/${answerId}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reaction_type: type }),
              }
            );
            document.getElementById(`like-count-${answerId}`).textContent =
              data.likes;
            document.getElementById(`dislike-count-${answerId}`).textContent =
              data.dislikes;
          } catch (err) {
            console.error("Error reacting:", err);
            alert(err.message || "Failed to react");
          }
        });
      });

      // ===== Bind comments =====
      answerCard.querySelectorAll(".comment-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const answerId = btn.dataset.answerId;
          const authorId = btn.dataset.authorId;
          loadAnswerComments(answerId, authorId);
        });
      });

      // ===== Bind edit & delete =====
      if (canEditDelete) {
        const editBtn = answerCard.querySelector(".edit-answer-btn");
        editBtn?.addEventListener("click", async () => {
          const answerP = answerCard.querySelector("p");
          const currentText = answerP.textContent.replace(/^.*?:\s/, "");
          const newAnswer = prompt("Edit your answer:", currentText);
          if (!newAnswer) return;
          try {
            await fetchWithAuth(
              `${BASE_URL}/student/community/answers/${ans.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answer: newAnswer }),
              }
            );
            answerP.innerHTML = `<strong>${escapeHTML(
              authorName
            )}:</strong> ${escapeHTML(newAnswer)}`;
            alert("Answer updated!");
          } catch (err) {
            console.error("Error updating answer:", err);
            alert("Failed to update answer.");
          }
        });

        const deleteBtn = answerCard.querySelector(".delete-answer-btn");
        deleteBtn?.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this answer?")) return;
          try {
            await fetchWithAuth(
              `${BASE_URL}/student/community/answers/${ans.id}`,
              { method: "DELETE" }
            );
            answerCard.remove();
            alert("Answer deleted!");
          } catch (err) {
            console.error("Error deleting answer:", err);
            alert("Failed to delete answer.");
          }
        });
      }
    });

    if (button) button.textContent = "Hide Answers";
  } catch (err) {
    console.error("Error loading answers:", err);
    answersDiv.innerHTML = `<p style="color:red; text-align:center;">Failed to load answers.</p>`;
    if (button) button.textContent = "View Answers";
  }
};

// ==============================
// Load leaderboard into table
// ==============================
export const loadLeaderboard = async () => {
  const tbody = document.querySelector("#community-leaderboard-table tbody");

  // Show loader first
  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        <div id="leaderboard-loader" class="loader"></div>
      </td>
    </tr>
  `;

  try {
    const leaderboard = await fetchWithAuth(
      `${BASE_URL}/student/community/leaderboard`
    );

    if (!leaderboard || leaderboard.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#aaa;">
            No leaderboard data available.
          </td>
        </tr>
      `;
      return;
    }

    // Render leaderboard rows
    tbody.innerHTML = leaderboard
      .map(
        (user) => `
        <tr>
          <td>${user.rank}</td>
          <td>${user.first_name} ${user.last_name}</td>
          <td>${user.xp}</td>
          <td>${user.level}</td>
          <td>
            <div style="background:#333; border-radius:4px; height:10px;">
              <div style="width:${user.progress}%; background:#00ffff; height:10px; border-radius:4px;"></div>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:red;">
          Failed to load leaderboard. Please try again later.
        </td>
      </tr>
    `;
  }
};

// ==============================
// Load all quizzes
// ==============================

// Submit answer to an admin post
export const submitAdminAnswer = async (postId) => {
  try {
    const answerInput = document.getElementById(`admin-answer-${postId}`);
    const answer = answerInput.value.trim();
    if (!answer) return alert("Please type an answer.");

    const res = await fetchWithAuth(`${BASE_URL}/student/community/answers`, {
      method: "POST",
      body: JSON.stringify({ post_id: postId, answer }),
    });

    alert(res.message || "Answer submitted!");
    answerInput.value = ""; // Clear textarea

    // Reload answers below the post
    await loadAdminAnswers(postId);
  } catch (err) {
    console.error("Error submitting admin answer:", err);
  }
};

// Load all answers for an admin post
export const loadAdminAnswers = async (postId) => {
  try {
    const answers = await fetchWithAuth(
      `${BASE_URL}/student/community/posts/${postId}/answers`
    );

    const answersDiv = document.getElementById(`admin-answers-${postId}`);
    if (!answersDiv) return;

    answersDiv.innerHTML = answers
      .map(
        (ans) =>
          `<p class="qa-author"><strong>${
            ans.first_name || ans.username || "Student"
          }:</strong> ${escapeHTML(ans.answer)}</p>`
      )
      .join("");
  } catch (err) {
    console.error("Error loading admin answers:", err);
  }
};

// Load Admin Posts
export const loadAdminPosts = async () => {
  try {
    const posts = await fetchWithAuth(`${BASE_URL}/student/community/posts`);

    const container = document.getElementById("community-admin-posts");
    container.innerHTML = "";

    posts
      .filter((post) => post.type === "challenge" || post.type === "question")
      .forEach((post) => {
        const postDiv = document.createElement("div");
        postDiv.classList.add("admin-post-card");
        postDiv.innerHTML = `
          <h4 class="qa-title">${escapeHTML(post.title)}</h4>
          <p>${escapeHTML(post.body)}</p>
          
        <div class="qa-meta">
        <span class="qa-author">${
          post.first_name || post.last_name || post.username || "Anonymous"
        }</span>
          <span class="qa-date">${new Date(post.created_at).toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>
          <div id="admin-answers-${post.id}" class="admin-answers"></div>
          <textarea id="admin-answer-${
            post.id
          }" rows="4" placeholder="Type your answer here..."></textarea>
          <button id="admin-answer-btn-${post.id}">Submit Answer</button>
        `;
        container.appendChild(postDiv);

        // Load existing answers
        loadAdminAnswers(post.id);

        // Add click listener for submit
        const btn = document.getElementById(`admin-answer-btn-${post.id}`);
        btn.addEventListener("click", () => submitAdminAnswer(post.id));
      });
  } catch (err) {
    console.error("Error loading admin posts:", err);
  }
};

// ==============================
// Load quizzes one by one
// ==============================

export const loadQuizzes = async () => {
  console.log("🎯 Loading quizzes...");

  try {
    const container = document.getElementById("community-quiz-container");
    if (!container) return;

    // Utility function to shuffle arrays
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    // Game state
    let xp = 0;
    let streak = 0;
    let lives = 3;

    // Core animations
    if (!document.getElementById("quiz-game-style")) {
      const style = document.createElement("style");
      style.id = "quiz-game-style";
      style.innerHTML = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fall { 0% { transform: translateY(0); opacity:1; } 100% { transform: translateY(100vh); opacity:0; } }
        .spinner { border: 4px solid #ccc; border-top: 4px solid var(--accent-color, #00ffff); border-radius: 50%; width: 40px; height: 40px; margin: auto; animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);
    }

    // Initial loader
    container.innerHTML = `
      <div id="quiz-loader" class="quiz-loader">
        <div class="spinner"></div>
        <p>Loading quizzes...</p>
      </div>
    `;

    let quizzes = await fetchWithAuth(`${BASE_URL}/student/community/quizzes`);
    if (!quizzes.length) {
      container.innerHTML = `<p class="no-quizzes">No quizzes available yet.</p>`;
      return;
    }

    // Shuffle quizzes
    shuffleArray(quizzes);

    // Shuffle options for each quiz
    quizzes = quizzes.map((quiz) => ({
      ...quiz,
      options: shuffleArray([...quiz.options]), // copy and shuffle
    }));

    let currentIndex = 0;

    // Sounds
    const correctSound = new Audio("./applause-cheer.mp3");
    const wrongSound = new Audio("./crowd-disappointment-reaction.mp3");
    const playSafe = (sound) => {
      try {
        sound.currentTime = 0;
        const playPromise = sound.play();
        if (playPromise !== undefined) playPromise.catch(() => {});
      } catch (err) {
        console.warn("Sound skipped:", err);
      }
    };

    // Confetti
    const triggerConfetti = () => {
      const confetti = document.createElement("div");
      confetti.innerHTML = "🎉";
      confetti.style.position = "fixed";
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = "0";
      confetti.style.fontSize = "2rem";
      confetti.style.animation = "fall 2s linear";
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 2000);
    };

    // Flying coins
    const triggerCoins = (count = 5) => {
      for (let i = 0; i < count; i++) {
        const coin = document.createElement("div");
        coin.innerHTML = "💰";
        coin.style.position = "fixed";
        coin.style.left = `${Math.random() * 80 + 10}%`;
        coin.style.bottom = "0";
        coin.style.fontSize = `${Math.random() * 20 + 20}px`;
        coin.style.zIndex = 9999;
        coin.style.pointerEvents = "none";
        coin.style.opacity = 1;
        document.body.appendChild(coin);
        coin.animate(
          [
            { transform: `translateY(0px) scale(1)`, opacity: 1 },
            {
              transform: `translateY(-200px) scale(0.5) rotate(${
                Math.random() * 360
              }deg)`,
              opacity: 0,
            },
          ],
          {
            duration: 1000 + Math.random() * 500,
            easing: "ease-out",
            fill: "forwards",
          }
        );
        setTimeout(() => coin.remove(), 1500);
      }
    };

    const updateProgress = () => {
      const fill = document.querySelector(".progress-fill");
      if (fill) fill.style.width = `${xp % 100}%`;
    };

    const renderGameHeader = () => `
      <div class="game-header">
        <span class="xp-display">XP: ${xp}</span>
        <span class="streak-display">🔥 Streak: ${streak}</span>
        <span class="lives-display">❤️ Lives: ${lives}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${xp % 100}%"></div>
      </div>
    `;

    const showQuiz = (quiz) => {
      container.innerHTML = renderGameHeader();

      const quizDiv = document.createElement("div");
      quizDiv.classList.add("quiz-card");
      quizDiv.innerHTML = `
        <h4 class="quiz-question">${escapeHTML(quiz.question)}</h4>
        <form id="quiz-form-${quiz.id}" class="quiz-form">
          <div class="quiz-options">
            ${quiz.options
              .map(
                (opt, idx) => `
              <div class="quiz-option-card">
                <input type="radio" id="quiz-${
                  quiz.id
                }-opt-${idx}" name="quiz-${quiz.id}" value="${opt}">
                <label for="quiz-${quiz.id}-opt-${idx}">${escapeHTML(
                  opt
                )}</label>
              </div>
            `
              )
              .join("")}
          </div>
          <button type="submit" class="quiz-submit-btn">Submit Answer</button>
        </form>
        <div id="quiz-result-${quiz.id}" class="quiz-result"></div>
      `;
      container.appendChild(quizDiv);

      // Highlight selected card
      const optionCards = quizDiv.querySelectorAll(".quiz-option-card");
      optionCards.forEach((card) => {
        const input = card.querySelector("input");
        input.addEventListener("change", () => {
          optionCards.forEach((c) => c.classList.remove("selected"));
          if (input.checked) card.classList.add("selected");
        });
      });

      const form = document.getElementById(`quiz-form-${quiz.id}`);
      const resultDiv = document.getElementById(`quiz-result-${quiz.id}`);

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const selected = form.querySelector(
          `input[name="quiz-${quiz.id}"]:checked`
        );
        if (!selected) return alert("Please select an option.");

        resultDiv.innerHTML = `<div class="spinner" style="margin:10px auto;"></div>`;

        try {
          const res = await submitQuiz(quiz.id, selected.value);
          resultDiv.innerHTML = "";

          if (res.correct) {
            playSafe(correctSound);
            triggerConfetti();
            triggerCoins(5);
            xp += res.xp || 10;
            streak++;
            resultDiv.innerHTML = `<span class="quiz-correct">✅ ${res.message} +${res.xp} XP</span>`;
          } else {
            playSafe(wrongSound);
            lives--;
            streak = 0;
            resultDiv.innerHTML = `
              <span class="quiz-wrong">❌ ${res.message}</span><br>
              <small class="quiz-correct-answer">Correct: ${escapeHTML(
                res.correctAnswer
              )}</small>
            `;
          }

          updateProgress();

          if (lives <= 0) {
            container.innerHTML = `<p class="quiz-game-over">💀 Game Over! Try again later.</p>`;
            return;
          }

          setTimeout(() => {
            currentIndex++;
            if (currentIndex < quizzes.length) showQuiz(quizzes[currentIndex]);
            else
              container.innerHTML = `<p class="quiz-complete">🎉 You completed all quizzes! Total XP: ${xp}</p>`;
          }, 3000);
        } catch (err) {
          console.error("Error submitting quiz:", err);
          resultDiv.innerHTML = `<span class="quiz-error">Failed to submit quiz. Try again.</span>`;
        }
      });
    };

    showQuiz(quizzes[currentIndex]);
  } catch (err) {
    console.error("❌ Error loading quizzes:", err);
    const container = document.getElementById("community-quiz-container");
    if (container)
      container.innerHTML = `<p class="quiz-error">Failed to load quizzes.</p>`;
  }
};

// Utility to escape HTML special characters
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==============================
// Submit a quiz answer
// ==============================
export const submitQuiz = async (quizId, selectedOption) => {
  try {
    const token = Session.token();
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.userId || payload.id;

    const res = await fetchWithAuth(`${BASE_URL}/quizzes/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, userId, selectedOption }),
    });

    loadLeaderboard(); // update leaderboard

    return res; // Return response so loadQuizzes can handle display
  } catch (err) {
    console.error("Error submitting quiz:", err);
    throw err;
  }
};

// ==============================
// Initialize community
// ==============================
export const initStudentCommunity = async () => {
  try {
    console.log("Loading posts...");
    await loadCommunityPosts();
    console.log("Posts loaded");

    console.log("Loading leaderboard...");
    await loadLeaderboard();
    console.log("Leaderboard loaded");

    console.log("Loading quizzes...");
    await loadQuizzes();
    console.log("Loading quizzes...");
    await loadAdminPosts();
    console.log("Quizzes loaded");
    setupAskQuestionFeature();
  } catch (err) {
    console.error("Error in initStudentCommunity:", err);
  }
};

// ==============================
// Make functions accessible globally for inline onclick
// ==============================
window.submitAnswer = submitAnswer;
window.loadAnswers = loadAnswers;
