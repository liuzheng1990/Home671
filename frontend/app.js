const API = "http://127.0.0.1:8000";
let selectedTags = [];

function toggleTag(tag) {
    const buttons = document.querySelectorAll("#tagButtons button");

    buttons.forEach(btn => {
        if (btn.innerText === tag) {
            btn.classList.toggle("active");

            if (selectedTags.includes(tag)) {
                selectedTags = selectedTags.filter(t => t !== tag);
                btn.classList.remove("btn-primary");
                btn.classList.add("btn-outline-primary");
            } else {
                selectedTags.push(tag);
                btn.classList.remove("btn-outline-primary");
                btn.classList.add("btn-primary");
            }
        }
    });
}

async function createTask() {
    const titleInput = document.getElementById("title");
    const title = titleInput.value.trim();

    if (!title) {
        alert("Please enter a task!");
        return;
    }

    await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: title,
            tags: selectedTags
        })
    });

    titleInput.value = "";
    selectedTags = [];

    document.querySelectorAll("#tagButtons button")
        .forEach(btn => {
            btn.classList.remove("active", "btn-primary");
            btn.classList.add("btn-outline-primary");
        });

    loadTasks();
}

async function loadTasks() {
    const response = await fetch(`${API}/tasks`);
    const tasks = await response.json();

    const container = document.getElementById("taskContainer");
    container.innerHTML = "";

    tasks.forEach(task => {

        const col = document.createElement("div");
        col.className = "col-md-4 col-sm-6 mb-4";

        const card = document.createElement("div");
        card.className = "card shadow task-card";

        if (task.completed) {
            card.classList.add("completed");
        }

        const cardBody = document.createElement("div");
        cardBody.className = "card-body text-center";

        const title = document.createElement("h4");
        title.className = "card-title";
        title.innerText = task.title;

        const tags = document.createElement("p");
        tags.className = "card-text";
        tags.innerText = task.tags.map(t => t.name).join(" ");

        cardBody.appendChild(title);
        cardBody.appendChild(tags);

        card.appendChild(cardBody);
        col.appendChild(card);
        container.appendChild(col);
    });
}

loadTasks();
