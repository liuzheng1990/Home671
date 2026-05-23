const API_URL = "/api";

let selectedTags = [];
let currentEditingTask = null;
let allTags = [];
let activeWeekTab = 0;  // -1=next week, 0=this week, 1=last week, 2=two weeks ago
const historyCharts = {};  // tracks Chart.js instances to destroy before re-render

function setActiveWeekTab(n) { activeWeekTab = n; }

/* =====================================
   Load Tags From Backend
===================================== */
async function loadTags() {
    const response = await fetch(`${API_URL}/tags`);
    const tags = await response.json();
    allTags = tags;

    const tagContainer = document.getElementById("tagButtons");
    tagContainer.innerHTML = "";

    tags.forEach(tag => {
        const button = document.createElement("button");

        button.className = `btn btn-outline-${tag.color} m-1`;
        button.innerText = `${tag.icon} ${tag.name}`;

        button.onclick = () => toggleTag(tag.name, button, tag.color);

        tagContainer.appendChild(button);
    });
}

/* =====================================
   Toggle Tag Selection
===================================== */
function toggleTag(tagName, buttonElement, color) {

    if (selectedTags.includes(tagName)) {
        selectedTags = selectedTags.filter(t => t !== tagName);
        buttonElement.classList.remove(`btn-${color}`);
        buttonElement.classList.add(`btn-outline-${color}`);
    } else {
        selectedTags.push(tagName);
        buttonElement.classList.remove(`btn-outline-${color}`);
        buttonElement.classList.add(`btn-${color}`);
    }
}

/* =====================================
   Create Task
===================================== */
async function createTask() {
    const titleInput = document.getElementById("title");
    const title = titleInput.value.trim();
    const taskCountInput = document.getElementById("taskCount");
    const taskCount = parseInt(taskCountInput.value) || 1;

    if (!title) {
        alert("Please enter a task! 📝");
        return;
    }

    if (taskCount < 1 || taskCount > 10) {
        alert("Please enter a number between 1 and 10! 🔢");
        return;
    }

    // Create multiple tasks with numbered titles
    const { start: weekStart } = getWeekRange(activeWeekTab);
    const pad = n => String(n).padStart(2, '0');
    const scheduledFor = `${weekStart.getFullYear()}-${pad(weekStart.getMonth() + 1)}-${pad(weekStart.getDate())}`;

    const createPromises = [];
    for (let i = 1; i <= taskCount; i++) {
        const numberedTitle = taskCount > 1 ? `${title} ${i}` : title;

        const promise = fetch(`${API_URL}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: numberedTitle,
                tags: selectedTags,
                scheduled_for: scheduledFor,
            })
        });
        createPromises.push(promise);
    }

    await Promise.all(createPromises);

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById("createTaskModal")).hide();

    // Reset form
    titleInput.value = "";
    taskCountInput.value = "1";
    selectedTags = [];

    // Reset tag buttons
    document.querySelectorAll("#tagButtons button")
        .forEach(btn => {
            const classes = btn.className;
            const colorMatch = classes.match(/btn-(primary|success|warning|danger|info|secondary|dark|light)/);
            if (colorMatch) {
                const color = colorMatch[1];
                btn.classList.remove(`btn-${color}`);
                btn.classList.add(`btn-outline-${color}`);
            }
        });

    loadTasks();
}

/* =====================================
   Toggle Complete / Undo
===================================== */
async function toggleComplete(taskId, currentState) {
    await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentState })
    });

    loadTasks();
}

/* =====================================
   Open Task Detail Modal
===================================== */
function openTaskDetail(task) {
    currentEditingTask = task;

    // Populate title
    document.getElementById("detailTitle").value = task.title;

    // Populate completion status
    const completionStatusDiv = document.getElementById("completionStatus");
    let statusHTML = "";

    if (task.completed && task.completed_at) {
        const completedDate = new Date(task.completed_at);
        const formattedDate = completedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        statusHTML = `<div class="completion-status completed">✅ Completed on ${formattedDate}</div>`;
    } else {
        statusHTML = `<div class="completion-status pending">⏳ Not yet completed</div>`;
    }
    completionStatusDiv.innerHTML = statusHTML;

    // Populate tags
    const detailTagContainer = document.getElementById("detailTagButtons");
    detailTagContainer.innerHTML = "";

    allTags.forEach(tag => {
        const button = document.createElement("button");
        button.className = `btn m-1`;

        // Check if this tag is already selected
        const isSelected = task.tags.some(t => t.name === tag.name);
        if (isSelected) {
            button.className += ` btn-${tag.color}`;
        } else {
            button.className += ` btn-outline-${tag.color}`;
        }

        button.innerText = `${tag.icon} ${tag.name}`;
        button.onclick = () => toggleDetailTag(tag, button);

        detailTagContainer.appendChild(button);
    });

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById("taskDetailModal"));
    modal.show();
}

/* =====================================
   Toggle Tag in Detail Modal
===================================== */
function toggleDetailTag(tag, buttonElement) {
    const isSelected = currentEditingTask.tags.some(t => t.name === tag.name);

    if (isSelected) {
        // Remove tag
        currentEditingTask.tags = currentEditingTask.tags.filter(t => t.name !== tag.name);
        buttonElement.classList.remove(`btn-${tag.color}`);
        buttonElement.classList.add(`btn-outline-${tag.color}`);
    } else {
        // Add tag
        currentEditingTask.tags.push(tag);
        buttonElement.classList.remove(`btn-outline-${tag.color}`);
        buttonElement.classList.add(`btn-${tag.color}`);
    }
}

/* =====================================
   Save Task Changes
===================================== */
async function saveTaskChanges() {
    const newTitle = document.getElementById("detailTitle").value.trim();

    if (!newTitle) {
        alert("Please enter a task title! 📝");
        return;
    }

    const tagNames = currentEditingTask.tags.map(t => t.name);

    await fetch(`${API_URL}/tasks/${currentEditingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: newTitle,
            tags: tagNames
        })
    });

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById("taskDetailModal")).hide();

    // Reload tasks
    loadTasks();
}

/* =====================================
   Delete Task
===================================== */
async function deleteTask() {
    if (!confirm("Are you sure you want to delete this task? 🗑️")) {
        return;
    }

    await fetch(`${API_URL}/tasks/${currentEditingTask.id}`, {
        method: "DELETE"
    });

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById("taskDetailModal")).hide();

    // Reload tasks
    loadTasks();
}

/* =====================================
   Week Range Helpers
===================================== */
function getWeekRange(weeksAgo) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);

    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday - weeksAgo * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

function formatDateTime(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/* =====================================
   Build a Task Card Element
===================================== */
function createTaskCard(task) {
    const col = document.createElement("div");
    col.className = "col-md-4 col-sm-6 mb-4";

    const card = document.createElement("div");
    card.className = "card shadow h-100 task-card";
    card.style.cursor = "pointer";
    card.onclick = () => openTaskDetail(task);

    const cardBody = document.createElement("div");
    cardBody.className = "card-body text-center";

    const title = document.createElement("h4");
    title.className = "card-title";
    title.innerText = task.title;

    /* ----- Render Colored Tag Badges ----- */
    const tagContainer = document.createElement("div");
    tagContainer.className = "mb-2";

    task.tags.forEach(tag => {
        const badge = document.createElement("span");
        badge.className = `badge bg-${tag.color} me-1`;
        badge.innerText = `${tag.icon} ${tag.name}`;
        tagContainer.appendChild(badge);
    });

    /* ----- Completion Date (for completed tasks) ----- */
    let completionDateDiv = null;
    if (task.completed && task.completed_at) {
        const completedDate = new Date(task.completed_at);
        const dayOfWeek = completedDate.toLocaleDateString("en-US", { weekday: "long" });

        completionDateDiv = document.createElement("p");
        completionDateDiv.className = "text-muted small mb-2";
        completionDateDiv.innerText = `✅ Completed on ${dayOfWeek}`;
    }

    /* ----- Complete / Undo Button ----- */
    const button = document.createElement("button");

    if (task.completed) {
        title.classList.add("card-completed");
        button.className = "btn btn-warning mt-2";
        button.innerText = "↩️ Undo";
    } else {
        button.className = "btn btn-success mt-2";
        button.innerText = "⭐ Complete";
    }

    button.onclick = (e) => {
        e.stopPropagation();
        toggleComplete(task.id, task.completed);
    };

    /* ----- Assemble Card ----- */
    cardBody.appendChild(title);
    cardBody.appendChild(tagContainer);
    if (completionDateDiv) {
        cardBody.appendChild(completionDateDiv);
    }
    cardBody.appendChild(button);

    card.appendChild(cardBody);
    col.appendChild(card);

    return col;
}

/* =====================================
   Load Tasks for One Week into Two Sub-sections
===================================== */
async function loadTasksForWeek(activeId, completedId, weeksAgo) {
    const { start, end } = getWeekRange(weeksAgo);
    const dateRange = `${formatDateTime(start)},${formatDateTime(end)}`;

    const response = await fetch(`${API_URL}/tasks?date_range=${encodeURIComponent(dateRange)}`);
    const tasks = await response.json();

    const activeContainer = document.getElementById(activeId);
    const completedContainer = document.getElementById(completedId);
    activeContainer.innerHTML = "";
    completedContainer.innerHTML = "";

    tasks.forEach(task => {
        const card = createTaskCard(task);
        if (task.completed) {
            completedContainer.appendChild(card);
        } else {
            activeContainer.appendChild(card);
        }
    });
}

/* =====================================
   Load Tasks (All Four Weeks)
===================================== */
async function loadTasks() {
    await Promise.all([
        loadTasksForWeek("nextWeekActive",    "nextWeekCompleted",    -1),
        loadTasksForWeek("thisWeekActive",    "thisWeekCompleted",     0),
        loadTasksForWeek("lastWeekActive",    "lastWeekCompleted",     1),
        loadTasksForWeek("twoWeeksAgoActive", "twoWeeksAgoCompleted",  2),
    ]);
}

/* =====================================
   View Switching (Tasks / History)
===================================== */
function showView(viewName) {
    document.getElementById("tasksView").style.display   = viewName === "tasks"   ? "" : "none";
    document.getElementById("historyView").style.display = viewName === "history" ? "" : "none";

    document.querySelectorAll(".kid-nav-btn[data-view]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    if (viewName === "history") loadHistoryView();
}

/* =====================================
   History Dashboard
===================================== */

async function loadHistoryView() {
    const { start: s0, end: e0 } = getWeekRange(0);
    const { start: s1, end: e1 } = getWeekRange(1);
    const range0 = `${formatDateTime(s0)},${formatDateTime(e0)}`;
    const range1 = `${formatDateTime(s1)},${formatDateTime(e1)}`;

    const [res0, res1] = await Promise.all([
        fetch(`${API_URL}/tasks?date_range=${encodeURIComponent(range0)}`),
        fetch(`${API_URL}/tasks?date_range=${encodeURIComponent(range1)}`)
    ]);
    const thisWeekTasks = await res0.json();
    const lastWeekTasks = await res1.json();

    renderHistoryTab("histThisWeekContent", thisWeekTasks, 0);
    renderHistoryTab("histLastWeekContent", lastWeekTasks, 1);
    renderBadges(thisWeekTasks, lastWeekTasks);
}

function renderHistoryTab(containerId, tasks, weeksAgo) {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;

    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="row g-3 mb-4 mt-1">
            <div class="col-6">
                <div class="history-stat-card history-stat-card--completed">
                    <div class="history-stat-number">${completed}</div>
                    <div class="history-stat-label">✅ Done!</div>
                </div>
            </div>
            <div class="col-6">
                <div class="history-stat-card history-stat-card--total">
                    <div class="history-stat-number">${total}</div>
                    <div class="history-stat-label">📋 Total</div>
                </div>
            </div>
        </div>
        <div class="row g-3">
            <div class="col-12 col-md-6">
                <div class="history-chart-card">
                    <h4 class="history-chart-title">📊 By Subject</h4>
                    <div class="history-chart-wrapper">
                        <canvas id="tagChart-${weeksAgo}"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6">
                <div class="history-chart-card">
                    <h4 class="history-chart-title">📅 Each Day</h4>
                    <div class="history-chart-wrapper">
                        <canvas id="dayChart-${weeksAgo}"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    historyCharts[`tag-${weeksAgo}`]?.destroy();
    historyCharts[`day-${weeksAgo}`]?.destroy();

    renderTagChart(`tagChart-${weeksAgo}`, tasks, weeksAgo);
    renderDayChart(`dayChart-${weeksAgo}`, tasks, weeksAgo);
}

function computeTagStats(tasks) {
    const map = new Map();
    tasks.forEach(task => {
        task.tags.forEach(tag => {
            if (!map.has(tag.name)) {
                map.set(tag.name, { icon: tag.icon, color: tag.color, completed: 0, total: 0 });
            }
            const entry = map.get(tag.name);
            entry.total++;
            if (task.completed) entry.completed++;
        });
    });
    return Array.from(map.entries())
        .map(([name, v]) => ({ tagName: name, ...v }))
        .sort((a, b) => a.tagName.localeCompare(b.tagName));
}

function renderTagChart(canvasId, tasks, weeksAgo) {
    const stats = computeTagStats(tasks);
    const ctx = document.getElementById(canvasId).getContext("2d");

    if (stats.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="text-center text-muted pt-5" style="font-size:1.2rem;">No tasks yet! 🌱</p>';
        return;
    }

    historyCharts[`tag-${weeksAgo}`] = new Chart(ctx, {
        type: "bar",
        data: {
            labels: stats.map(s => `${s.icon} ${s.tagName}`),
            datasets: [
                {
                    label: "Completed",
                    data: stats.map(s => s.completed),
                    backgroundColor: "#4caf50",
                    borderRadius: 8
                },
                {
                    label: "Total",
                    data: stats.map(s => s.total),
                    backgroundColor: "#ffe082",
                    borderRadius: 8
                }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { font: { size: 14 } } }
            },
            scales: {
                x: { ticks: { font: { size: 13 }, stepSize: 1 }, beginAtZero: true },
                y: { ticks: { font: { size: 15 } } }
            }
        }
    });
}

function computeDayStats(tasks) {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon=0 … Sun=6
    tasks.forEach(task => {
        if (task.completed && task.completed_at) {
            const dayIndex = (new Date(task.completed_at).getDay() + 6) % 7;
            counts[dayIndex]++;
        }
    });
    return counts;
}

function renderDayChart(canvasId, tasks, weeksAgo) {
    const counts = computeDayStats(tasks);
    const ctx = document.getElementById(canvasId).getContext("2d");
    const dayColors = ["#f7c028", "#f5901e", "#4caf50", "#2196f3", "#e91e63", "#9c27b0", "#ff5722"];

    historyCharts[`day-${weeksAgo}`] = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [{
                label: "Tasks Done",
                data: counts,
                backgroundColor: dayColors,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { font: { size: 15 } } },
                y: { beginAtZero: true, ticks: { font: { size: 13 }, stepSize: 1 } }
            }
        }
    });
}

function computeBadges(thisWeekTasks, lastWeekTasks) {
    const twCompleted = thisWeekTasks.filter(t => t.completed);
    const lwCompleted = lastWeekTasks.filter(t => t.completed);

    // 3-Day Streak: distinct calendar days with at least one completion this week
    const twDays = new Set(twCompleted.filter(t => t.completed_at).map(t => new Date(t.completed_at).toDateString()));

    // Power Day: max completions on a single calendar day (across both weeks)
    const allCompleted = [...twCompleted, ...lwCompleted].filter(t => t.completed_at);
    const dayCounts = {};
    allCompleted.forEach(t => {
        const d = new Date(t.completed_at).toDateString();
        dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const maxDay = Math.max(0, ...Object.values(dayCounts));

    // All-Rounder: distinct tags in completed tasks this week
    const twTagNames = new Set(twCompleted.flatMap(t => t.tags.map(tag => tag.name)));

    // Getting Better: completion rates
    const twRate = thisWeekTasks.length > 0 ? twCompleted.length / thisWeekTasks.length : 0;
    const lwRate = lastWeekTasks.length > 0 ? lwCompleted.length / lastWeekTasks.length : 0;

    return [
        {
            emoji: "🏆",
            label: "Perfect Week!",
            earned: thisWeekTasks.length > 0 && twCompleted.length === thisWeekTasks.length
        },
        {
            emoji: "🥇",
            label: "Last Week Champ",
            earned: lastWeekTasks.length > 0 && lwCompleted.length === lastWeekTasks.length
        },
        {
            emoji: "🔥",
            label: "3-Day Streak",
            earned: twDays.size >= 3
        },
        {
            emoji: "⚡",
            label: "Power Day",
            earned: maxDay >= 3
        },
        {
            emoji: "🌈",
            label: "All-Rounder",
            earned: twTagNames.size >= 3
        },
        {
            emoji: "📈",
            label: "Getting Better!",
            earned: thisWeekTasks.length > 0 && lastWeekTasks.length > 0 && twRate > lwRate
        }
    ];
}

function renderBadges(thisWeekTasks, lastWeekTasks) {
    const badges = computeBadges(thisWeekTasks, lastWeekTasks);
    const grid = document.getElementById("badgesGrid");
    grid.innerHTML = badges.map(b => `
        <div class="badge-card ${b.earned ? "badge-card--earned" : "badge-card--locked"}">
            <div class="badge-card__emoji">${b.earned ? b.emoji : "??"}</div>
            <div class="badge-card__label">${b.label}</div>
        </div>
    `).join("");
}

/* =====================================
   Initial Page Load
===================================== */
loadTags();
loadTasks();
