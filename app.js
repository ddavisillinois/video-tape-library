const STORAGE_KEY = "rewind-tapes-v1";
const ACTIVITY_KEY = "rewind-activity-v1";

const seedTapes = [
  { id: crypto.randomUUID(), title: "The Grand Budapest Hotel", director: "Wes Anderson", year: 2014, genre: "Comedy, Drama", runtime: 100, format: "VHS", notes: "Pink case edition.", status: "available", addedAt: Date.now() - 86400000 * 2 },
  { id: crypto.randomUUID(), title: "Spirited Away", director: "Hayao Miyazaki", year: 2001, genre: "Animation", runtime: 125, format: "VHS", notes: "Studio Ghibli collection.", status: "available", addedAt: Date.now() - 86400000 * 4 },
  { id: crypto.randomUUID(), title: "The Matrix", director: "The Wachowskis", year: 1999, genre: "Sci-Fi", runtime: 136, format: "VHS-C", notes: "", status: "borrowed", borrower: "Maya R.", addedAt: Date.now() - 86400000 * 7 },
  { id: crypto.randomUUID(), title: "Moonlight", director: "Barry Jenkins", year: 2016, genre: "Drama", runtime: 111, format: "VHS", notes: "", status: "available", addedAt: Date.now() - 86400000 * 9 },
  { id: crypto.randomUUID(), title: "Alien", director: "Ridley Scott", year: 1979, genre: "Horror, Sci-Fi", runtime: 117, format: "Betamax", notes: "Original rental store label.", status: "available", addedAt: Date.now() - 86400000 * 10 },
  { id: crypto.randomUUID(), title: "Do the Right Thing", director: "Spike Lee", year: 1989, genre: "Drama", runtime: 120, format: "VHS", notes: "", status: "available", addedAt: Date.now() - 86400000 * 12 }
];

let tapes = load(STORAGE_KEY, null) || seedTapes;
let activity = load(ACTIVITY_KEY, [
  { text: "Library initialized with starter tapes", time: Date.now() - 86400000 * 2, icon: "✦" },
  { text: "The Matrix checked out to Maya R.", time: Date.now() - 86400000, icon: "↗" }
]);
let activeFilter = "all";
let editingId = null;

const $ = (selector) => document.querySelector(selector);
const tapeGrid = $("#tape-grid");
const emptyState = $("#empty-state");
const dialog = $("#tape-dialog");
const form = $("#tape-form");

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tapes));
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 8)));
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
function formatRuntime(minutes) { return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function relativeTime(timestamp) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
function addActivity(text, icon = "✦") {
  activity.unshift({ text, icon, time: Date.now() });
  save();
}
function coverClass(tape) {
  return ["", "orange", "blue", "purple", "rose"][Math.abs([...tape.title].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 5];
}
function filteredTapes() {
  const query = $("#search-input").value.trim().toLowerCase();
  const sort = $("#sort-select").value;
  const result = tapes.filter((tape) => {
    const matchesFilter = activeFilter === "all" || tape.status === activeFilter;
    const haystack = `${tape.title} ${tape.director} ${tape.genre} ${tape.format}`.toLowerCase();
    return matchesFilter && haystack.includes(query);
  });
  return result.sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "year" ? (b.year || 0) - (a.year || 0) : sort === "runtime" ? b.runtime - a.runtime : b.addedAt - a.addedAt);
}
function render() {
  const available = tapes.filter((t) => t.status === "available").length;
  const borrowed = tapes.length - available;
  const runtime = tapes.reduce((sum, t) => sum + Number(t.runtime || 0), 0);
  $("#total-count").textContent = tapes.length;
  $("#available-count").textContent = available;
  $("#borrowed-count").textContent = borrowed;
  $("#borrowed-detail").textContent = borrowed ? `${borrowed} currently on loan` : "Nothing on loan";
  $("#runtime-count").textContent = `${Math.floor(runtime / 60)}h`;
  $("#all-filter-count").textContent = tapes.length;
  const visible = filteredTapes();
  $("#result-summary").textContent = `${visible.length} tape${visible.length === 1 ? "" : "s"} in your archive`;
  tapeGrid.innerHTML = visible.map((tape) => `
    <article class="tape-card">
      <div class="cover ${coverClass(tape)}">
        <span class="cover-label">${escapeHtml(tape.genre || "Archive")}</span>
        <span class="format-badge">${escapeHtml(tape.format)}</span>
        <h3>${escapeHtml(tape.title)}</h3>
      </div>
      <div class="tape-info">
        <div class="tape-meta"><span>${escapeHtml(tape.director || "Unknown director")}</span><span>${tape.year || "Year unknown"}</span><span>${formatRuntime(tape.runtime || 0)}</span></div>
        <div class="tape-footer">
          <span class="status ${tape.status === "borrowed" ? "borrowed" : ""}">${tape.status === "borrowed" ? `Out · ${escapeHtml(tape.borrower || "On loan")}` : "● Available"}</span>
          <div class="card-actions">
            <button class="small-button" data-action="edit" data-id="${tape.id}">Edit</button>
            <button class="small-button" data-action="toggle" data-id="${tape.id}">${tape.status === "borrowed" ? "Return" : "Lend"}</button>
            <button class="small-button" data-action="delete" data-id="${tape.id}" aria-label="Delete ${escapeHtml(tape.title)}">×</button>
          </div>
        </div>
      </div>
    </article>`).join("");
  emptyState.classList.toggle("hidden", visible.length > 0);
  $("#activity-list").innerHTML = activity.slice(0, 5).map((item) => `<div class="activity-item"><span class="activity-icon">${item.icon}</span><span>${escapeHtml(item.text)}</span><time>${relativeTime(item.time)}</time></div>`).join("");
}
function openDialog(tape = null) {
  editingId = tape?.id || null;
  $("#dialog-title").textContent = tape ? "Edit tape details" : "Add a new tape";
  form.reset();
  if (tape) Object.entries(tape).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
  dialog.showModal();
}
function closeDialog() { dialog.close(); editingId = null; }

$("#add-tape-button").addEventListener("click", () => openDialog());
$("#empty-add-button").addEventListener("click", () => openDialog());
$("#close-dialog").addEventListener("click", closeDialog);
$("#cancel-dialog").addEventListener("click", closeDialog);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.year = data.year ? Number(data.year) : null;
  data.runtime = Number(data.runtime) || 0;
  if (editingId) {
    const tape = tapes.find((item) => item.id === editingId);
    Object.assign(tape, data);
    addActivity(`Updated ${tape.title}`, "✎");
    showToast("Tape updated");
  } else {
    const tape = { ...data, id: crypto.randomUUID(), status: "available", addedAt: Date.now() };
    tapes.unshift(tape);
    addActivity(`Added ${tape.title} to the archive`, "＋");
    showToast("Tape added to your archive");
  }
  save(); closeDialog(); render();
});
tapeGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const tape = tapes.find((item) => item.id === button.dataset.id);
  if (!tape) return;
  if (button.dataset.action === "edit") openDialog(tape);
  if (button.dataset.action === "delete" && confirm(`Remove "${tape.title}" from your archive?`)) {
    tapes = tapes.filter((item) => item.id !== tape.id);
    addActivity(`Removed ${tape.title} from the archive`, "×"); save(); render(); showToast("Tape removed");
  }
  if (button.dataset.action === "toggle") {
    if (tape.status === "borrowed") {
      tape.status = "available"; const title = tape.title; delete tape.borrower;
      addActivity(`${title} was returned to the archive`, "↙"); showToast("Tape marked available");
    } else {
      const borrower = prompt(`Who is borrowing "${tape.title}"?`, "Guest");
      if (!borrower) return;
      tape.status = "borrowed"; tape.borrower = borrower;
      addActivity(`${tape.title} checked out to ${borrower}`, "↗"); showToast("Tape checked out");
    }
    save(); render();
  }
});
document.querySelectorAll(".filter-button").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-button").forEach((item) => item.classList.toggle("active", item === button));
  render();
}));
$("#search-input").addEventListener("input", render);
$("#sort-select").addEventListener("change", render);
$("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(tapes, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "rewind-library.json"; link.click(); URL.revokeObjectURL(link.href);
  showToast("Archive exported");
});
let toastTimer;
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2400); }
render();
