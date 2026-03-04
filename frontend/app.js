const API_URL = "/api";

let selectedTags = [];

/* =====================================
   Load Tags From Backend
===================================== */
async function loadTags() {
    const response = await fetch(`${API_URL}/tags`);
    const tags = await response.json();

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

    if (!title) {
        alert("Please enter a task!");
        return;
    }

    await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: title,
            tags: selectedTags
        })
    });

    // Reset form
    titleInput.value = "";
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
    card.className = "card shadow h-100";

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

    button.onclick = () => toggleComplete(task.id, task.completed);

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
   Initial Page Load
===================================== */
loadTags();
loadTasks();
