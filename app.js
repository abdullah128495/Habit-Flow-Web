const SUPABASE_URL = 'https://gdzxpkbgnzflqayxwcmk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wvrb5_VJ7tkdOVM5CAuXag_NnPSWCs_';

const _supabase = (SUPABASE_URL !== 'https://gdzxpkbgnzflqayxwcmk.supabase.co' && SUPABASE_URL !== '') 
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

const authModal = document.getElementById('auth-modal');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchText = document.getElementById('auth-switch-text');
const authSwitchBtn = document.getElementById('auth-switch-btn');
const userEmailDisplay = document.getElementById('user-email-display');

let isLoginMode = true;
let currentUser = localStorage.getItem('currentUser') || null;

const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitCategory = document.getElementById('habit-category');
const habitTime = document.getElementById('habit-time');
const habitTarget = document.getElementById('habit-target');
const habitList = document.getElementById('habit-list');
const premiumModal = document.getElementById('premium-modal');
const userBadge = document.getElementById('user-badge');
const headerProBtn = document.getElementById('header-pro-btn');

const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statRate = document.getElementById('stat-rate');
const topTaskCount = document.getElementById('top-task-count');
const freeLimitText = document.getElementById('free-limit-text');

const FREE_LIMIT = 3;
let isPro = localStorage.getItem('isPro') === 'true';

let rawHabits = JSON.parse(localStorage.getItem('habits')) || [];
let habits = rawHabits.map(h => {
    if (typeof h === 'string') {
        return { text: h, category: 'Genel', time: 'Sabah', progress: 0, target: 10, completed: false };
    }
    return {
        text: h.text || 'Alışkanlık',
        category: h.category || 'Sağlık',
        time: h.time || 'Sabah',
        progress: h.progress || 0,
        target: h.target || 10,
        completed: h.completed || false
    };
});

let waterMl = parseInt(localStorage.getItem('waterMl')) || 0;
let calorieKcal = parseInt(localStorage.getItem('calorieKcal')) || 0;
let workouts = JSON.parse(localStorage.getItem('workouts')) || [false, false, false];

function checkAuthStatus() {
    if (!currentUser) {
        authModal.style.display = 'flex';
    } else {
        authModal.style.display = 'none';
        userEmailDisplay.textContent = currentUser;
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authSubmitBtn.textContent = 'Giriş Yap';
        authSwitchText.textContent = "Hesabın yok mu?";
        authSwitchBtn.textContent = 'Kayıt Ol';
    } else {
        authSubmitBtn.textContent = 'Kayıt Ol';
        authSwitchText.textContent = "Zaten hesabın var mı?";
        authSwitchBtn.textContent = 'Giriş Yap';
    }
}

function handleAuth(e) {
    e.preventDefault();
    const email = authEmail.value.trim();
    if (!email) return;

    currentUser = email;
    localStorage.setItem('currentUser', currentUser);
    authModal.style.display = 'none';
    userEmailDisplay.textContent = currentUser;
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    authModal.style.display = 'flex';
}

function setTheme(theme) {
    document.body.className = '';
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('theme-light').classList.add('active');
    } else if (theme === 'cyberpunk') {
        document.body.classList.add('cyberpunk-theme');
        document.getElementById('theme-cyberpunk').classList.add('active');
    } else {
        document.getElementById('theme-dark').classList.add('active');
    }
}

function scrollToTasks() {
    document.getElementById('tasks-section').scrollIntoView({ behavior: 'smooth' });
}

function updateProUI() {
    if (isPro) {
        userBadge.textContent = 'Pro Üye';
        userBadge.className = 'badge-pro';
        if (headerProBtn) headerProBtn.style.display = 'none';
        if (freeLimitText) freeLimitText.textContent = 'Sınırsız Pro Görev';
    } else {
        userBadge.textContent = 'Ücretsiz Plan';
        userBadge.className = 'badge-free';
        if (headerProBtn) headerProBtn.style.display = 'inline-block';
        if (freeLimitText) freeLimitText.textContent = `Ücretsiz Limit: ${habits.length} / ${FREE_LIMIT}`;
    }
}

function saveAndRender() {
    localStorage.setItem('habits', JSON.stringify(habits));
    renderHabits();
    updateStats();
    updateProUI();
}

function updateStats() {
    const total = habits.length;
    const completed = habits.filter(h => h.completed || h.progress >= h.target).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statRate.textContent = `%${rate}`;
    if (topTaskCount) topTaskCount.textContent = total;
}

function renderHabits() {
    habitList.innerHTML = '';
    if (habits.length === 0) {
        habitList.innerHTML = '<li style="justify-content:center; color:#64748b; font-size:0.85rem;">Henüz görev eklenmedi. Yukarıdan yeni bir görev ekleyin!</li>';
        return;
    }

    habits.forEach((habit, index) => {
        const percent = Math.min(Math.round((habit.progress / habit.target) * 100), 100);
        const li = document.createElement('li');
        li.className = habit.completed ? 'completed' : '';
        li.innerHTML = `
            <div class="habit-info">
                <div class="habit-header-row">
                    <span><strong>${habit.text}</strong></span>
                    <div class="habit-tags">
                        <span class="tag-time">📌 ${habit.time}</span>
                        <span class="tag-cat">🏷️ ${habit.category}</span>
                    </div>
                </div>
                <div class="habit-progress-area">
                    <span>İlerleme: ${habit.progress} / ${habit.target} (%${percent})</span>
                    <div class="progress-bar" style="margin-top: 4px;"><div class="progress-fill" style="width: ${percent}%"></div></div>
                </div>
            </div>
            <div class="habit-actions">
                <button onclick="incrementProgress(${index})" title="İlerleme Ekle">+1</button>
                <button onclick="toggleHabit(${index})">${habit.completed ? 'Geri' : '✓'}</button>
                <button onclick="deleteHabit(${index})" class="delete-btn">✕</button>
            </div>
        `;
        habitList.appendChild(li);
    });
}

function incrementProgress(index) {
    if (habits[index].progress < habits[index].target) {
        habits[index].progress += 1;
        if (habits[index].progress >= habits[index].target) {
            habits[index].completed = true;
        }
        saveAndRender();
    }
}

function renderHealthModules() {
    document.getElementById('water-count').textContent = waterMl;
    const waterPercent = Math.min((waterMl / 2500) * 100, 100);
    document.getElementById('water-bar').style.width = `${waterPercent}%`;

    document.getElementById('calorie-count').textContent = calorieKcal;
    const caloriePercent = Math.min((calorieKcal / 2200) * 100, 100);
    document.getElementById('calorie-bar').style.width = `${caloriePercent}%`;

    const completedWorkouts = workouts.filter(Boolean).length;
    document.getElementById('workout-streak').textContent = `${completedWorkouts} / 3 Gün`;

    const dayBtns = document.querySelectorAll('.day-btn');
    dayBtns.forEach((btn, idx) => {
        if (workouts[idx]) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function addWater(amount) {
    if (!isPro) {
        openModal();
        return;
    }
    waterMl += amount;
    if (waterMl > 4000) waterMl = 0;
    localStorage.setItem('waterMl', waterMl);
    renderHealthModules();
}

function addCalorie(amount) {
    if (!isPro) {
        openModal();
        return;
    }
    calorieKcal += amount;
    if (calorieKcal > 4000) calorieKcal = 0;
    localStorage.setItem('calorieKcal', calorieKcal);
    renderHealthModules();
}

function toggleWorkout(dayIndex) {
    if (!isPro) {
        openModal();
        return;
    }
    workouts[dayIndex] = !workouts[dayIndex];
    localStorage.setItem('workouts', JSON.stringify(workouts));
    renderHealthModules();
}

habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = habitInput.value.trim();
    if (!text) return;

    if (!isPro && habits.length >= FREE_LIMIT) {
        openModal();
        return;
    }

    const category = habitCategory.value;
    const time = habitTime.value;
    const target = parseInt(habitTarget.value) || 10;

    habits.push({ text, category, time, progress: 0, target, completed: false });
    habitInput.value = '';
    saveAndRender();
});

function toggleHabit(index) {
    habits[index].completed = !habits[index].completed;
    if (habits[index].completed) {
        habits[index].progress = habits[index].target;
    }
    saveAndRender();
}

function deleteHabit(index) {
    habits.splice(index, 1);
    saveAndRender();
}

function openModal() {
    premiumModal.classList.remove('hidden');
}

function closeModal() {
    premiumModal.classList.add('hidden');
}

function simulatePayment() {
    alert('Shopier ödeme sayfasına yönlendiriliyorsunuz (Test Modu: Pro özellikler aktif edildi!).');
    isPro = true;
    localStorage.setItem('isPro', 'true');
    updateProUI();
    closeModal();
}

checkAuthStatus();
updateProUI();
renderHabits();
updateStats();
renderHealthModules();