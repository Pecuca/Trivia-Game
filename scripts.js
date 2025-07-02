async function fetchQuestions(amount = 10, category = 9, difficulty = 'medium', type = 'multiple') {
  const endpoint = `https://opentdb.com/api.php?amount=${amount}`
                 + `&category=${category}`
                 + `&difficulty=${difficulty}`
                 + `&type=${type}`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.response_code !== 0) {
      throw new Error('No se pudieron obtener las preguntas');
    }

    return data.results;  // Array de objetos pregunta
  } catch (error) {
    console.error('Error al obtener trivia:', error);
    return [];
  }
}

function decodeHtml(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function prepareQuestion(item) {
  const questionText = decodeHtml(item.question);
  const answers = shuffleArray([
    decodeHtml(item.correct_answer),
    ...item.incorrect_answers.map(decodeHtml)
  ]);

  return { questionText, answers, correct: decodeHtml(item.correct_answer) };
}

let timerInterval;
let timeLeft = 20;

function startTimer(callback) {
  clearInterval(timerInterval);
  timeLeft = 20;
  document.getElementById('timer-box').textContent = `${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer-box').textContent = `${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      callback(); // pasa a la siguiente pregunta automáticamente
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

let score = 0;

function handleAnswer(selected, btnElem) {
  stopTimer();

  // Disable all cards
  const cards = document.querySelectorAll('.answer-card');
  cards.forEach(card => card.onclick = null);

  // Find correct and selected cards
  let correctCard = null;
  cards.forEach(card => {
    if (card.textContent === currentQuestion.correct) correctCard = card;
    card.classList.remove('selected');
  });

  btnElem.classList.add('selected');

  // Feedback logic
  let showBonus = false;
  if (selected === currentQuestion.correct) {
    btnElem.classList.add('correct');
    showVignette('green');
    score += 10;
    showBonus = true;
  } else {
    btnElem.classList.add('incorrect');
    if (correctCard) {
      correctCard.classList.add('correct');
    }
    showVignette('red');
    document.getElementById('question-container').classList.add('shake');
    setTimeout(() => {
      document.getElementById('question-container').classList.remove('shake');
    }, 400);
  }

  // Show "+10" in score and on button ONLY if correct
  if (showBonus) {
    // Score box animation
    const scoreBox = document.getElementById('score-box');
    scoreBox.textContent = `+10`;
    setTimeout(() => {
      scoreBox.textContent = score;
    }, 700);

    // Button animation
    const plus10 = document.createElement('span');
    plus10.textContent = '+10';
    plus10.style.position = 'absolute';
    plus10.style.top = '8px';
    plus10.style.right = '16px';
    plus10.style.fontSize = '1.1em';
    plus10.style.color = '#fff';
    plus10.style.background = 'rgba(60,200,120,0.9)';
    plus10.style.borderRadius = '8px';
    plus10.style.padding = '2px 8px';
    plus10.style.opacity = '1';
    plus10.style.transition = 'opacity 0.7s, transform 0.7s';
    btnElem.appendChild(plus10);
    setTimeout(() => {
      plus10.style.opacity = '0';
      plus10.style.transform = 'translateY(-20px)';
    }, 400);
    setTimeout(() => {
      if (plus10.parentNode) plus10.parentNode.removeChild(plus10);
    }, 1100);
  }

  // Next question after delay
  setTimeout(() => {
    removeVignette();
    nextQuestion();
  }, 1200);
}

// Vignette helpers
function showVignette(color) {
  removeVignette();
  const v = document.createElement('div');
  v.className = 'vignette vignette--' + color;
  v.id = 'vignette-effect';
  v.style.opacity = '1';
  v.style.transition = 'opacity 0.5s';
  document.body.appendChild(v);
}

function removeVignette() {
  const v = document.getElementById('vignette-effect');
  if (v) {
    v.style.opacity = '0';
    setTimeout(() => { if (v.parentNode) v.parentNode.removeChild(v); }, 500);
  }
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
      showQuestion();
  } else {
      // Aquí muestras la pantalla de resultados
      showResults();
  }
}

// Al enviar la configuración, iniciar el juego y la música
document.getElementById('settings-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    document.getElementById('settings-form-container').style.display = 'none';
    document.getElementById('play-button-container').style.display = 'none';
    // Show music controls and play music
    document.getElementById('music-controls').style.display = 'flex';
    const bgMusic = document.getElementById('bg-music');
    bgMusic.play().catch(()=>{});
    // Start the game (await the async function!)
    await startGame();
});

// Ejemplo de función para cargar categorías y dificultades desde la API de Open Trivia
function loadCategoriesAndDifficulties() {
    // Load categories from API (already in English)
    fetch('https://opentdb.com/api_category.php')
        .then(res => res.json())
        .then(data => {
            const categorySelect = document.getElementById('category');
            categorySelect.innerHTML = '<option value="" disabled selected hidden>Select category</option>';
            data.trivia_categories.forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        });

    // Load difficulties in English
    const difficultySelect = document.getElementById('difficulty');
    difficultySelect.innerHTML = `
        <option value="" disabled selected hidden>Select difficulty</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
    `;
}

let questions = [];
let currentQuestionIndex = 0;
let currentQuestion = null;

async function startGame() {
    document.getElementById('main-title').style.display = 'none';
    document.getElementById('main-desc').style.display = 'none';

    // Fade to black
    const overlay = document.getElementById('bg-fade-overlay');
    overlay.style.opacity = '1';
    await new Promise(res => setTimeout(res, 400)); // Wait for fade

    // Switch backgrounds
    const menuBg = document.getElementById('background-video-menu');
    const gameBg = document.getElementById('background-video-game');
    if (menuBg && gameBg) {
        menuBg.style.opacity = '0';
        gameBg.style.opacity = '1';
    }

    // Fade back in
    setTimeout(() => {
        overlay.style.opacity = '0';
    }, 400);

    score = 0;

    // Obtener valores seleccionados del formulario
    const amount = document.getElementById('num-questions').value;
    const category = document.getElementById('category').value;
    const difficulty = document.getElementById('difficulty').value;

    // Pedir preguntas a la API
    questions = await fetchQuestions(amount, category, difficulty, 'multiple');
    currentQuestionIndex = 0;

    if (questions.length === 0) {
        alert('No se pudieron obtener preguntas. Intenta con otra configuración.');
        document.getElementById('settings-form').style.display = 'block';
        return;
    }

    // *** SHOW THE GAME AREA ***
    document.getElementById('game-area').style.display = 'flex';

    showQuestion();

    // Show the info box when the game starts
    document.getElementById('game-info-box').style.display = 'flex';
    document.getElementById('question-container').style.display = 'flex';
    document.getElementById('game-difficulty').textContent = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
    document.getElementById('total-questions').textContent = questions.length;
}

function showQuestion() {
    currentQuestion = prepareQuestion(questions[currentQuestionIndex]);
    document.getElementById('question-container').style.display = 'flex';

    // Wrap question text in the box
    document.getElementById('question-text').innerHTML =
        `<div class="question-title-box">${currentQuestion.questionText}</div>`;

    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';
    currentQuestion.answers.forEach(answer => {
        const btn = document.createElement('div');
        btn.className = 'answer-card';
        btn.tabIndex = 0;
        btn.textContent = answer;
        btn.onclick = () => handleAnswer(answer, btn);
        btn.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") btn.click(); };
        answersDiv.appendChild(btn);
    });

    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('score-box').textContent = `Score: ${score}`;

    startTimer();
}

document.getElementById('exit-to-name').onclick = function() {
    // Hide game area, show name form, reset as needed
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('player-form-container').style.display = 'flex';
    // Reset other UI as needed
};

document.getElementById('give-up').onclick = function() {
    // Hide game area, show settings/options
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('settings-form-container').style.display = 'block';
    document.getElementById('play-button-container').style.display = 'block';
    // Reset other UI as needed
};

document.getElementById('player-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const playerName = document.getElementById('player-name').value;
    document.getElementById('player-name-header').textContent = playerName;

    // Hide name form and logo
    document.getElementById('player-form-container').style.display = 'none';
    document.getElementById('logo').style.display = 'none';

    // Show header and description (title/desc) for settings/options screen
    document.getElementById('main-title').style.display = 'block';
    document.getElementById('main-desc').style.display = 'block';

    // Show settings/options and play button
    document.getElementById('settings-form-container').style.display = 'block';
    document.getElementById('play-button-container').style.display = 'block';

    // Load categories and difficulties
    loadCategoriesAndDifficulties();
});

document.getElementById('main-title').style.display = 'none';
document.getElementById('main-desc').style.display = 'none';

loadCategoriesAndDifficulties();

const bgMusic = document.getElementById('bg-music');
const musicVolume = document.getElementById('music-volume');
const musicToggle = document.getElementById('music-toggle');

if (bgMusic && musicVolume) {
    // Set initial volume
    bgMusic.volume = musicVolume.value;

    // Update volume on slider change
    musicVolume.addEventListener('input', function() {
        bgMusic.volume = this.value;
    });
}

if (bgMusic && musicToggle) {
    musicToggle.addEventListener('click', function() {
        bgMusic.muted = !bgMusic.muted;
        musicToggle.textContent = bgMusic.muted ? '🔇' : '🔊';
    });
}