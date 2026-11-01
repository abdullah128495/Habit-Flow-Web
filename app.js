const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');

let habits = JSON.parse(localStorage.getItem('habits')) || [];

function saveAndRender() {
  localStorage.setItem('habits', JSON.stringify(habits));
  renderHabits();
}

function renderHabits() {
  habitList.innerHTML = '';
  
  habits.forEach((habit, index) => {
    const li = document.createElement('li');
    li.className = `habit-item ${habit.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
      <span class="habit-text" onclick="toggleHabit(${index})">${habit.text}</span>
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
  const text = habitInput.value.trim();
  if (text !== '') {
    habits.push({ text, completed: false });
    habitInput.value = '';
    saveAndRender();
  }
});

function toggleHabit(index) {
  habits[index].completed = !habits[index].completed;
  saveAndRender();
}

function deleteHabit(index) {
  habits.splice(index, 1);
  saveAndRender();
}

renderHabits();