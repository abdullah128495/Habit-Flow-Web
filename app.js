const SUPABASE_URL = 'https://gdzxpkbgnzflqayxwcmk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wvrb5_VJ7tkdOVM5CAuXag_NnPSWCs_';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitCategory = document.getElementById('habit-category');
const habitTime = document.getElementById('habit-time');
const habitTarget = document.getElementById('habit-target');
const habitList = document.getElementById('habit-list');

const toggleTasksBtn = document.getElementById('toggle-tasks-btn');
const tasksDropdownMenu = document.getElementById('tasks-dropdown-menu');
const taskList = document.getElementById('task-list');

const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statRate = document.getElementById('stat-rate');

const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const authContainer = document.getElementById('auth-container');
const appContent = document.getElementById('app-content');
const userEmailDisplay = document.getElementById('user-email-display');
const userBadge = document.getElementById('user-badge');
const upgradeModal = document.getElementById('upgrade-modal');

let habits = [];
let tasks = [];
let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'dark';

setTheme(currentTheme);

function setTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('theme', themeName);
}

// Açılır Görevler Menü Kontrolü
if (toggleTasksBtn && tasksDropdownMenu) {
  toggleTasksBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = tasksDropdownMenu.style.display === 'block';
    tasksDropdownMenu.style.display = isVisible ? 'none' : 'block';
  });

  window.addEventListener('click', () => {
    tasksDropdownMenu.style.display = 'none';
  });

  tasksDropdownMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Oturum Durumunu Kontrol Et
async function checkUser() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user || null;
  updateAuthUI();
  if (currentUser) {
    fetchHabits();
    checkAndGenerateDailyTasks();
  } else {
    habits = [];
    tasks = [];
    renderHabits();
    renderTasks();
    updateStats();
  }
}

function updateAuthUI() {
  if (currentUser) {
    authContainer.style.display = 'none';
    appContent.style.display = 'block';
    userEmailDisplay.textContent = `👤 ${currentUser.email}`;
  } else {
    authContainer.style.display = 'block';
    appContent.style.display = 'none';
  }
}

// Giriş Yap
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Giriş yapılırken hata: ' + error.message);
  } else {
    currentUser = data.user;
    updateAuthUI();
    fetchHabits();
    checkAndGenerateDailyTasks();
  }
});

// Kayıt Ol
signupBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    alert('Lütfen e-posta ve şifre girin!');
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    alert('Kayıt olurken hata: ' + error.message);
  } else {
    alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
  }
});

// Çıkış Yap
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
  habits = [];
  tasks = [];
  renderHabits();
  renderTasks();
  updateStats();
});

// Alışkanlıkları Çek
async function fetchHabits() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('habits')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('id', { ascending: true });

  if (!error) {
    habits = data || [];
    renderHabits();
    updateStats();
  }
}

// BUGÜNÜN TARİHİNİ AL (YYYY-MM-DD formatında)
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GÖREV HAVUZU
const taskPool = [
  "💧 1.25 litre su iç",
  "📚 15 dakika kitap oku",
  "🚶 20 dakika yürüyüş yap",
  "💻 30 dakika kodlama çalış",
  "🧘 10 dakika meditasyon yap",
  "🍏 Bir porsiyon meyve ye",
  "🛏️ Odanı havalandır ve topla",
  "👁️ 5 dakika göz dinlendirme molası ver",
  "✍️ Günlük tut veya plan yap",
  "🌱 50 squat yap"
];

// HER GÜN OTOMATİK GÖREVLERİ KONTROL ET
async function checkAndGenerateDailyTasks() {
  if (!currentUser) return;

  const todayStr = getTodayDateString();

  const { data, error } = await supabaseClient
    .from('tasks')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('task_date', todayStr);

  if (!error) {
    if (data.length === 0) {
      // Başlangıç için rastgele 4 görev seç
      const shuffled = [...taskPool].sort(() => 0.5 - Math.random());
      const initialTasks = shuffled.slice(0, 4).map(text => ({
        text: text,
        completed: false,
        user_id: currentUser.id,
        task_date: todayStr
      }));

      await supabaseClient.from('tasks').insert(initialTasks);
      fetchTasks();
    } else {
      tasks = data;
      renderTasks();
    }
  }
}

async function fetchTasks() {
  if (!currentUser) return;
  const todayStr = getTodayDateString();

  const { data, error } = await supabaseClient
    .from('tasks')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('task_date', todayStr)
    .order('id', { ascending: true });

  if (!error) {
    tasks = data || [];
    renderTasks();
  }
}

function updateStats() {
  const total = habits.length;
  const completed = habits.filter(h => h.progress >= h.target).length;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statRate.textContent = `%${rate}`;
}

function renderHabits() {
  habitList.innerHTML = '';
  
  habits.forEach((habit) => {
    const target = habit.target || 3;
    const progress = habit.progress || 0;
    const isCompleted = progress >= target;
    const percentage = Math.min(100, Math.round((progress / target) * 100));

    const li = document.createElement('li');
    li.className = `habit-item ${isCompleted ? 'completed' : ''}`;
    
    li.innerHTML = `
      <div class="habit-info" style="width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="habit-text">${habit.text}</span>
          <div>
            <span class="time-badge">${habit.time || '🌅 Sabah'}</span>
            <span class="category-badge">🏷️ ${habit.category || 'Genel'}</span>
          </div>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
          </div>
          <span class="progress-text">İlerleme: ${progress} / ${target} (%${percentage})</span>
        </div>
      </div>
      
      <div class="actions" style="margin-top: 10px;">
        <button class="btn-icon btn-check" onclick="incrementProgress(${habit.id}, ${progress}, ${target}, '${habit.text}')">✓</button>
        <button class="btn-icon btn-delete" onclick="deleteHabit(${habit.id})">✕</button>
      </div>
    `;
    habitList.appendChild(li);
  });
}

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = '';

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; font-size: 0.85rem;";
    
    li.innerHTML = `
      <span style="color: #fff;">${task.text}</span>
      <button onclick="toggleTask(${task.id})" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">✓</button>
    `;
    taskList.appendChild(li);
  });
}

// Yeni Alışkanlık Ekle
habitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const text = habitInput.value.trim();
  const category = habitCategory.value;
  const time = habitTime.value;
  const target = parseInt(habitTarget.value) || 3;

  if (text !== '') {
    const { error } = await supabaseClient
      .from('habits')
      .insert([{ text, category, time, completed: false, streak: 1, target: target, progress: 0, user_id: currentUser.id }]);

    if (!error) {
      habitInput.value = '';
      habitTarget.value = '3';
      fetchHabits();
    }
  }
});

// GÖREVİ TAMAMLA VE YERİNE YENİSİNİ GETİR
async function toggleTask(id) {
  if (!currentUser) return;
  const todayStr = getTodayDateString();

  // 1. Tamamlanan görevi sil
  const { error: deleteError } = await supabaseClient
    .from('tasks')
    .delete()
    .eq('id', id);

  if (deleteError) return;

  // 2. Havuzdan listede olmayan rastgele yeni görev seç
  const existingTexts = tasks.map(t => t.text);
  const availablePool = taskPool.filter(t => !existingTexts.includes(t));
  const randomText = availablePool.length > 0 
    ? availablePool[Math.floor(Math.random() * availablePool.length)]
    : taskPool[Math.floor(Math.random() * taskPool.length)];

  // 3. Yeni görevi ekle
  const { error: insertError } = await supabaseClient
    .from('tasks')
    .insert([{ 
      text: randomText, 
      completed: false, 
      user_id: currentUser.id, 
      task_date: todayStr 
    }]);

  if (!insertError) {
    alert('🎉 Harika! Görev tamamlandı ve yerine yeni bir görev eklendi.');
    fetchTasks();
  }
}

async function incrementProgress(id, currentProgress, target, habitText) {
  const newProgress = currentProgress + 1;
  const isNowCompleted = newProgress >= target;

  const { error } = await supabaseClient
    .from('habits')
    .update({ progress: newProgress, completed: isNowCompleted })
    .eq('id', id);

  if (!error) {
    if (isNowCompleted && currentProgress < target) {
      alert(`🎉 Tebrikler! "${habitText}" için hedefiniz tamamlandı!`);
    }
    fetchHabits();
  }
}

async function deleteHabit(id) {
  const { error } = await supabaseClient
    .from('habits')
    .delete()
    .eq('id', id);

  if (!error) {
    fetchHabits();
  }
}

// Ödeme ve Pro Yükseltme Fonksiyonları
function openUpgradeModal() {
  if (upgradeModal) upgradeModal.style.display = 'flex';
}

function closeUpgradeModal() {
  if (upgradeModal) upgradeModal.style.display = 'none';
}

function simulatePayment() {
  const onay = confirm("HabitFlow Pro (49 TL/ay) aboneliği için ödeme sayfasına yönlendirileceksiniz. Onaylıyor musunuz?");
  if (onay) {
    // Shopier veya ödeme linkini buraya ekleyebilirsin
    const paymentUrl = "BURAYA_SHOPIER_ODEME_LINKINI_YAPISTIR";
    window.location.href = paymentUrl;
  }
}

// Sayfa açıldığında oturumu kontrol et
checkUser();