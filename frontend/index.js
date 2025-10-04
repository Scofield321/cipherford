import { BASE_URL } from "./config.js";
// -------- Navigation Toggle --------
const toggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");
toggle.addEventListener("click", () => navMenu.classList.toggle("open"));

// -------- Hide sidebar when clicking a link (mobile) --------
const navLinks = navMenu.querySelectorAll("a"); // all links inside the menu
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open"); // hide the sidebar
  });
});

// -------- Sections Animation --------
const sections = document.querySelectorAll(".section");
const observer = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        obs.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);
sections.forEach((section) => observer.observe(section));

// -------- Modal for Free Lessons --------
const modal = document.getElementById("freeLessonModal");
const closeBtn = modal?.querySelector(".close");
document.querySelectorAll(".try-lesson").forEach((btn) => {
  btn.addEventListener("click", () => (modal.style.display = "flex"));
});
closeBtn?.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});
document.querySelectorAll(".program-img").forEach((img) => {
  const loader = img.previousElementSibling; // the spinner div
  img.addEventListener("load", () => {
    img.classList.add("loaded");
    loader.style.display = "none";
  });
  if (img.complete) {
    img.classList.add("loaded");
    loader.style.display = "none";
  }
});

// -------- Current Year --------
document.getElementById("current-year").textContent = new Date().getFullYear();

// -------- Booking Form Submission --------
const bookingForm = document.getElementById("bookingForm");
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const date = document.getElementById("lesson-date").value;
    const email = document.getElementById("contact-email").value;
    const phone = document.getElementById("contact-phone").value;
    const wechat = document.getElementById("contact-wechat").value;

    try {
      const loader = document.getElementById("booking-loader");
      loader.style.display = "block"; // show loader
      const res = await fetch(`${BASE_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, email, phone, wechat }),
      });
      loader.style.display = "none"; // hide loader
      const result = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Booking Sent!",
          text: "✅ Your free lesson request has been sent. We'll contact you soon!",
          confirmButtonColor: "#1a9fff",
        });
        bookingForm.reset();
        modal.style.display = "none";
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: result.error || "❌ Something went wrong, please try again.",
          confirmButtonColor: "#1a9fff",
        });
      }
    } catch (err) {
      console.error("Error submitting booking form:", err);
      Swal.fire({
        icon: "error",
        title: "Unexpected Error",
        text: "❌ An unexpected error occurred. Please try again later.",
        confirmButtonColor: "#1a9fff",
      });
    } finally {
      loader.style.display = "none"; // hide loader
    }
  });
}
