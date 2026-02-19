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
        body: JSON.stringify({
            completed: !currentState
        })
    });

    loadTasks();
}

/* =====================================
   Load Tasks
===================================== */
async function loadTasks() {
    const response = await fetch(`${API_URL}/tasks`);
    const tasks = await response.json();

    const activeContainer = document.getElementById("activeTasks");
    const completedContainer = document.getElementById("completedTasks");

    activeContainer.innerHTML = "";
    completedContainer.innerHTML = "";

    tasks.forEach(task => {

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

        if (task.completed) {
            completedContainer.appendChild(col);
        } else {
            activeContainer.appendChild(col);
        }
    });
}

/* =====================================
   Initial Page Load
===================================== */
loadTags();
loadTasks();
