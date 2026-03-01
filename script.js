(() => {
  const DEFAULT_DURATIONS = {
    pomodoro: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
  };

  const STORAGE_KEYS = {
    TASKS: "focusflow.tasks",
    TIMER: "focusflow.timer"
  };

  const minutesEl = document.getElementById("timer-minutes");
  const secondsEl = document.getElementById("timer-seconds");
  const progressEl = document.getElementById("timer-progress");
  const startPauseBtn = document.getElementById("timer-start-pause");
  const resetBtn = document.getElementById("timer-reset");
  const modeButtons = Array.from(
    document.querySelectorAll(".mode-button[data-mode]")
  );

  const taskForm = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const taskListEl = document.getElementById("task-list");
  const tasksCounterEl = document.getElementById("tasks-counter");
  const clearCompletedBtn = document.getElementById("clear-completed");

  let timerInterval = null;

  const initialTimerState = {
    mode: "pomodoro",
    remainingSeconds: DEFAULT_DURATIONS.pomodoro,
    totalSeconds: DEFAULT_DURATIONS.pomodoro,
    isRunning: false
  };

  let timerState = loadTimerState() || { ...initialTimerState };

  let tasks = loadTasks();

  function persistTasks() {
    try {
      window.localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (_) {}
  }

  function loadTasks() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((task) => ({
        id: typeof task.id === "string" ? task.id : crypto.randomUUID(),
        title: String(task.title || ""),
        completed: Boolean(task.completed)
      }));
    } catch {
      return [];
    }
  }

  function persistTimerState() {
    try {
      const stateToSave = {
        mode: timerState.mode,
        remainingSeconds: timerState.remainingSeconds,
        totalSeconds: timerState.totalSeconds,
        isRunning: false
      };
      window.localStorage.setItem(
        STORAGE_KEYS.TIMER,
        JSON.stringify(stateToSave)
      );
    } catch (_) {}
  }

  function loadTimerState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.TIMER);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const mode =
        parsed.mode === "short" || parsed.mode === "long"
          ? parsed.mode
          : "pomodoro";
      const totalSeconds =
        typeof parsed.totalSeconds === "number" &&
        parsed.totalSeconds > 0 &&
        parsed.totalSeconds < 60 * 60 * 3
          ? parsed.totalSeconds
          : DEFAULT_DURATIONS[mode];
      const remainingSeconds =
        typeof parsed.remainingSeconds === "number" &&
        parsed.remainingSeconds > 0 &&
        parsed.remainingSeconds <= totalSeconds
          ? parsed.remainingSeconds
          : totalSeconds;
      return {
        mode,
        totalSeconds,
        remainingSeconds,
        isRunning: false
      };
    } catch {
      return null;
    }
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return { m, s };
  }

  function updateTimerDisplay() {
    const { m, s } = formatTime(timerState.remainingSeconds);
    minutesEl.textContent = m;
    secondsEl.textContent = s;

    const ratio =
      timerState.totalSeconds > 0
        ? 1 - timerState.remainingSeconds / timerState.totalSeconds
        : 0;
    progressEl.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;

    const modeLabel =
      timerState.mode === "short"
        ? "Short Break"
        : timerState.mode === "long"
        ? "Long Break"
        : "Pomodoro";
    document.title = `${m}:${s} • ${modeLabel} – FocusFlow`;
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerState.isRunning = false;
    startPauseBtn.textContent = "Start";
    persistTimerState();
  }

  function tick() {
    if (timerState.remainingSeconds <= 0) {
      stopTimer();
      flashTimerDone();
      return;
    }
    timerState.remainingSeconds -= 1;
    updateTimerDisplay();
    persistTimerState();
  }

  function startTimer() {
    if (timerState.isRunning) return;
    timerState.isRunning = true;
    startPauseBtn.textContent = "Pause";
    if (timerInterval !== null) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
  }

  function resetTimerForMode(mode) {
    const clampedMode =
      mode === "short" || mode === "long" ? mode : "pomodoro";
    const total = DEFAULT_DURATIONS[clampedMode];
    timerState = {
      mode: clampedMode,
      remainingSeconds: total,
      totalSeconds: total,
      isRunning: false
    };
    updateTimerDisplay();
    persistTimerState();
  }

  function setMode(mode) {
    const target =
      mode === "short" || mode === "long" ? mode : "pomodoro";
    stopTimer();
    resetTimerForMode(target);
    modeButtons.forEach((btn) => {
      const isActive = btn.dataset.mode === target;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function flashTimerDone() {
    try {
      if (document.hasFocus()) {
        const msg =
          timerState.mode === "pomodoro"
            ? "Pomodoro finished! Time for a break."
            : "Break finished! Ready for another Pomodoro?";
        window.alert(msg);
      }
    } catch (_) {}
  }

  function createTaskElement(task) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task as completed");

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    if (task.completed) {
      title.classList.add("completed");
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "task-delete";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", "Delete task");
    deleteBtn.textContent = "✕";

    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(actions);

    return li;
  }

  function renderTasks() {
    taskListEl.innerHTML = "";
    tasks.forEach((task) => {
      const el = createTaskElement(task);
      taskListEl.appendChild(el);
    });
    updateTasksCounter();
  }

  function updateTasksCounter() {
    const total = tasks.length;
    const remaining = tasks.filter((t) => !t.completed).length;
    let label = "";
    if (total === 0) {
      label = "No tasks yet";
    } else if (remaining === 0) {
      label = `${total} task${total > 1 ? "s" : ""} • all done`;
    } else {
      label = `${remaining} of ${total} left`;
    }
    tasksCounterEl.textContent = label;
  }

  function addTask(title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: trimmed,
      completed: false
    };
    tasks.push(task);
    persistTasks();
    renderTasks();
  }

  function toggleTaskCompleted(id, completed) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], completed: Boolean(completed) };
    persistTasks();
    renderTasks();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    persistTasks();
    renderTasks();
  }

  function clearCompletedTasks() {
    const hasCompleted = tasks.some((t) => t.completed);
    if (!hasCompleted) return;
    tasks = tasks.filter((t) => !t.completed);
    persistTasks();
    renderTasks();
  }

  function initTimerUI() {
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        if (!mode) return;
        setMode(mode);
      });
    });

    startPauseBtn.addEventListener("click", () => {
      if (timerState.isRunning) {
        stopTimer();
      } else {
        startTimer();
      }
    });

    resetBtn.addEventListener("click", () => {
      stopTimer();
      resetTimerForMode(timerState.mode);
    });

    setMode(timerState.mode);
    timerState.remainingSeconds = Math.min(
      timerState.remainingSeconds,
      timerState.totalSeconds
    );
    updateTimerDisplay();
  }

  function initTasksUI() {
    renderTasks();

    taskForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!taskInput.value.trim()) return;
      addTask(taskInput.value);
      taskInput.value = "";
      taskInput.focus();
    });

    taskListEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const itemEl = target.closest(".task-item");
      if (!itemEl) return;
      const id = itemEl.dataset.id;
      if (!id) return;

      if (target.classList.contains("task-delete")) {
        deleteTask(id);
        return;
      }

      if (target.classList.contains("task-checkbox")) {
        const checked = target.checked;
        toggleTaskCompleted(id, checked);
      }
    });

    clearCompletedBtn.addEventListener("click", () => {
      clearCompletedTasks();
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      persistTimerState();
    }
  });

  initTimerUI();
  initTasksUI();
})();

