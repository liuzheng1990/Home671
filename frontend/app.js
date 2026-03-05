const API_URL = "/api";

let selectedTags = [];
let currentEditingTask = null;
let allTags = [];

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
    const createPromises = [];
    for (let i = 1; i <= taskCount; i++) {
        const numberedTitle = taskCount > 1 ? `${title} ${i}` : title;

        const promise = fetch(`${API_URL}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: numberedTitle,
                tags: selectedTags
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
   Load Tasks (All Three Weeks)
===================================== */
async function loadTasks() {
    await Promise.all([
        loadTasksForWeek("thisWeekActive",    "thisWeekCompleted",    0),
        loadTasksForWeek("lastWeekActive",    "lastWeekCompleted",    1),
        loadTasksForWeek("twoWeeksAgoActive", "twoWeeksAgoCompleted", 2)
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
}

/* =====================================
   Initial Page Load
===================================== */
loadTags();
loadTasks();
