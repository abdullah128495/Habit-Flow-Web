const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');
const modal = document.getElementById('premium-modal');

const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statRate = document.getElementById('stat-rate');

const FREE_LIMIT = 3;
let habits = JSON.parse(localStorage.getItem('habits')) || [];

function saveAndRender() {
  localStorage.setItem('habits', JSON.stringify(habits));
  renderHabits();
  updateStats();
}

function updateStats() {
  const total = habits.length;
  const completed = habits.filter(h => h.completed).length;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statRate.textContent = `%${rate}`;
}

function renderHabits() {
  habitList.innerHTML = '';
  
  habits.forEach((habit, index) => {
    const li = document.createElement('li');
    li.className = `habit-item ${habit.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
      <div class="habit-info">
        <span class="habit-text" onclick="toggleHabit(${index})">${habit.text}</span>
        <span class="streak-badge">🔥 ${habit.streak || 1} gün</span>
      </div>
      <div class="actions">
        <button class="btn-icon btn-check" onclick="toggleHabit(${index})">${habit.completed ? '↩' : '✓'}</button>
        <button class="btn-icon btn-delete" onclick="deleteHabit(${index})">✕</button>
      </div>
    `;
    
    habitList.appendChild(li);
  });
}

habitForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Ücretsiz Limit Kontrolü
  if (habits.length >= FREE_LIMIT) {
    modal.classList.remove('hidden');
    return;
  }

  const text = habitInput.value.trim();
  if (text !== '') {
    habits.push({ text, completed: false, streak: 1 });
    habitInput.value = '';
    saveAndRender();
  }
});

function toggleHabit(index) {
  habits[index].completed = !habits[index].completed;
  if (habits[index].completed) {
    habits[index].streak = (habits[index].streak || 1) + 1;
  }
  saveAndRender();
}

function deleteHabit(index) {
  habits.splice(index, 1);
  saveAndRender();
}

function closeModal() {
  modal.classList.add('hidden');
}

renderHabits();
updateStats();