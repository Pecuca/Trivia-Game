// --- Trivia Frenzy Game Script ---
// Este archivo contiene toda la lógica del juego de trivia, incluyendo la gestión de pantallas, preguntas, respuestas, temporizador, puntaje y feedback visual.

// --- Utilidades para obtener preguntas y preparar datos ---
// Obtiene preguntas de la API de Open Trivia DB según la configuración seleccionada
async function fetchQuestions(amount = 10, category = "any", difficulty = 'medium', type = 'multiple') {
    let endpoint = `https://opentdb.com/api.php?amount=${amount}`;
    if (category !== "any") endpoint += `&category=${category}`;
    endpoint += `&difficulty=${difficulty}&type=${type}`;

    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.response_code !== 0) {
            throw new Error('No se pudieron obtener las preguntas');
        }

        return data.results;
    } catch (error) {
        console.error('Error al obtener trivia:', error);
        return [];
    }
}

// Decodifica entidades HTML en texto plano (para mostrar preguntas y respuestas correctamente)
function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

// Mezcla aleatoriamente los elementos de un array (para respuestas)
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Prepara una pregunta para mostrarla en pantalla
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

// --- Temporizador para responder cada pregunta ---
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 20;
    const timerBox = document.getElementById('timer-box');
    timerBox.textContent = `${timeLeft}s`;
    timerBox.style.color = "#fff";

    timerInterval = setInterval(() => {
        timeLeft--;
        timerBox.textContent = `${timeLeft}s`;
        // Cambia a rojo si quedan 10 segundos o menos
        timerBox.style.color = timeLeft <= 10 ? "#ff3c3c" : "#fff";
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Si se acaba el tiempo, cuenta como incorrecta y muestra feedback visual
            answersHistory.push({ correct: false, time: 20 });
            // Muestra la respuesta correcta y animación de error
            const cards = document.querySelectorAll('.answer-card');
            let correctCard = null;
            cards.forEach(card => {
                if (card.textContent === currentQuestion.correct) correctCard = card;
                card.onclick = null;
                card.classList.remove('selected');
            });
            if (correctCard) correctCard.classList.add('correct');
            document.getElementById('question-container').classList.add('shake');
            showVignette('red');
            setTimeout(() => {
                document.getElementById('question-container').classList.remove('shake');
                removeVignette();
                nextQuestion();
            }, 1200);
        }
    }, 1000);
}

// Detiene el temporizador actual
function stopTimer() {
    clearInterval(timerInterval);
}

let score = 0;

// --- Maneja la lógica al seleccionar una respuesta ---
function handleAnswer(selected, btnElem) {
    stopTimer();

    // Guarda si la respuesta fue correcta y el tiempo usado
    answersHistory.push({
        correct: selected === currentQuestion.correct,
        time: 20 - timeLeft
    });

    // Deshabilita todas las tarjetas de respuesta
    const cards = document.querySelectorAll('.answer-card');
    cards.forEach(card => card.onclick = null);

    // Busca la tarjeta correcta y la seleccionada
    let correctCard = null;
    cards.forEach(card => {
        if (card.textContent === currentQuestion.correct) correctCard = card;
        card.classList.remove('selected');
    });

    btnElem.classList.add('selected');

    // Feedback visual y puntaje
    let showBonus = false;
    if (selected === currentQuestion.correct) {
        btnElem.classList.add('correct');
        showVignette('green');
        score += 10;
        showBonus = true;
    } else {
        btnElem.classList.add('incorrect');
        if (correctCard) correctCard.classList.add('correct');
        showVignette('red');
        document.getElementById('question-container').classList.add('shake');
        setTimeout(() => {
            document.getElementById('question-container').classList.remove('shake');
        }, 400);
    }

    // Animación de puntaje y feedback visual
    if (showBonus) {
        const scoreBox = document.getElementById('score-box');
        scoreBox.textContent = `+10`;
        setTimeout(() => { scoreBox.textContent = score; }, 700);
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

    // Actualiza los contadores de correctas/incorrectas
    const correct = answersHistory.filter(a => a.correct).length;
    const incorrect = answersHistory.filter(a => a.correct === false).length;
    document.getElementById('game-correct-inline').textContent = correct;
    document.getElementById('game-incorrect-inline').textContent = incorrect;

    // Pasa a la siguiente pregunta después de un breve retraso
    setTimeout(() => {
        removeVignette();
        nextQuestion();
    }, 1200);
}

// --- Feedback visual de acierto/error (vignette y shake) ---
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

// --- Avanza a la siguiente pregunta o muestra los resultados ---
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        showResults();
    }
}

// --- Inicializa el juego con la configuración seleccionada ---
async function startGame() {
    document.getElementById('main-title').style.display = 'none';
    document.getElementById('main-desc').style.display = 'none';

    // Cambia la opacidad de los videos de fondo
    const menuBg = document.getElementById('background-video-menu');
    const gameBg = document.getElementById('background-video-game');
    if (menuBg && gameBg) {
        menuBg.style.opacity = '0';
        gameBg.style.opacity = '1';
    }

    score = 0;
    answersHistory = [];

    // Obtiene la configuración seleccionada
    const amount = document.getElementById('num-questions').value;
    const category = document.getElementById('category').value;
    const difficulty = document.getElementById('difficulty').value;

    // Guarda la dificultad global para mostrarla en cada pregunta
    window.currentDifficulty = difficulty;

    // Pide preguntas a la API
    questions = await fetchQuestions(amount, category, difficulty, 'multiple');
    currentQuestionIndex = 0;

    if (questions.length === 0) {
        alert('No se pudieron obtener preguntas. Intenta con otra configuración.');
        document.getElementById('settings-form').style.display = 'block';
        return;
    }

    // Muestra el área de juego y resetea contadores
    document.getElementById('game-area').style.display = 'flex';

    showQuestion();

    // Muestra la caja de información al iniciar el juego
    document.getElementById('game-info-box').style.display = 'flex';
    document.getElementById('question-container').style.display = 'flex';
    // Solo el valor de dificultad (Easy, Medium, Hard)
    document.getElementById('game-difficulty').textContent =
        difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    document.getElementById('total-questions').textContent = questions.length;
    document.getElementById('game-correct-inline').textContent = '0';
    document.getElementById('game-incorrect-inline').textContent = '0';
}

// --- Muestra la pregunta y las respuestas en pantalla ---
function showQuestion() {
    currentQuestion = prepareQuestion(questions[currentQuestionIndex]);
    document.getElementById('question-container').style.display = 'flex';

    // Muestra el texto de la pregunta
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

    // Actualiza los contadores de correctas/incorrectas
    const correct = answersHistory.filter(a => a.correct).length;
    const incorrect = answersHistory.filter(a => a.correct === false).length;
    document.getElementById('game-correct-inline').textContent = correct;
    document.getElementById('game-incorrect-inline').textContent = incorrect;

    // Muestra la dificultad actual
    if (window.currentDifficulty) {
        document.getElementById('game-difficulty').textContent =
            window.currentDifficulty.charAt(0).toUpperCase() + window.currentDifficulty.slice(1);
    }

    startTimer();
}

// --- Pantalla de resultados y navegación ---
function showResults() {
    document.getElementById('game-area').style.display = 'none';
    const resultsScreen = document.getElementById('results-screen');
    resultsScreen.style.display = 'flex';

    // Calcula y muestra los datos finales
    const playerName = document.getElementById('player-name-header').textContent;
    const totalQuestions = questions.length;
    const correct = answersHistory.filter(a => a.correct).length;
    const totalTime = answersHistory.reduce((acc, a) => acc + a.time, 0);
    const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const avgTime = totalQuestions > 0 ? (totalTime / totalQuestions).toFixed(2) : 0;

    // Determina si el jugador gana o pierde
    const isWin = percentage >= 50;
    const resultsTitle = document.getElementById('results-title');
    resultsTitle.textContent = isWin ? 'YOU WIN!' : 'YOU LOOSE!';
    resultsTitle.className = isWin ? 'win' : 'lose';
    resultsTitle.style.textShadow = '0px 3px 2px #0000009b';
    resultsTitle.style.color = '';
    resultsTitle.style.borderBottom = '';
    resultsTitle.style.paddingBottom = '8px';

    // Muestra los datos finales
    document.getElementById('result-player-name').textContent = playerName;
    document.getElementById('result-score').textContent = score;
    document.getElementById('result-correct').textContent = `${correct} / ${totalQuestions}`;
    document.getElementById('result-percentage').textContent = `${percentage}%`;
    document.getElementById('result-avg-time').textContent = `${avgTime}s`;

    // Feedback visual de victoria o derrota
    showVignette(isWin ? 'green' : 'red');
    setTimeout(removeVignette, 1200);

    // Botón: Jugar de nuevo con la misma configuración
    document.getElementById('play-same-config').onclick = async function() {
        resultsScreen.style.display = 'none';
        answersHistory = [];
        await startGame();
    };

    // Botón: Cambiar configuración y jugar
    document.getElementById('play-new-config').onclick = function() {
        resultsScreen.style.display = 'none';
        document.getElementById('settings-form-container').style.display = 'block';
        document.getElementById('play-button-container').style.display = 'block';
        document.getElementById('logo').style.display = 'none';
        document.getElementById('main-title').style.display = 'block';
    };

    // Botón: Finalizar y volver al menú principal
    document.getElementById('end-game').onclick = function() {
        resultsScreen.style.display = 'none';
        document.getElementById('player-form-container').style.display = 'flex';
        document.getElementById('logo').style.display = 'block';
        document.getElementById('main-title').style.display = 'none';
        document.getElementById('main-desc').style.display = 'none';
        const menuBg = document.getElementById('background-video-menu');
        const gameBg = document.getElementById('background-video-game');
        if (menuBg && gameBg) {
            menuBg.style.opacity = '1';
            gameBg.style.opacity = '0';
        }
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }
        document.getElementById('music-controls').style.display = 'none';
        answersHistory = [];
    };
}

// --- Carga categorías y dificultades desde la API de Open Trivia ---
function loadCategoriesAndDifficulties() {
    fetch('https://opentdb.com/api_category.php')
        .then(res => res.json())
        .then(data => {
            const categorySelect = document.getElementById('category');
            categorySelect.innerHTML = '<option value="any" selected>Mixed (All Categories)</option>';
            data.trivia_categories.forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        });
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
let answersHistory = [];

// --- Navegación entre pantallas y botones principales ---
document.getElementById('settings-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    document.getElementById('settings-form-container').style.display = 'none';
    document.getElementById('play-button-container').style.display = 'none';
    document.getElementById('music-controls').style.display = 'flex';
    const bgMusic = document.getElementById('bg-music');
    bgMusic.play().catch(()=>{});
    await startGame();
});
document.getElementById('exit-to-name').onclick = function() {
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('player-form-container').style.display = 'flex';
    document.getElementById('logo').style.display = 'block';
    document.getElementById('main-title').style.display = 'none';
    document.getElementById('main-desc').style.display = 'none';
    const menuBg = document.getElementById('background-video-menu');
    const gameBg = document.getElementById('background-video-game');
    if (menuBg && gameBg) {
        menuBg.style.opacity = '1';
        gameBg.style.opacity = '0';
    }
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
    document.getElementById('music-controls').style.display = 'none';
};
document.getElementById('give-up').onclick = function() {
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('settings-form-container').style.display = 'block';
    document.getElementById('play-button-container').style.display = 'block';
    document.getElementById('main-title').style.display = 'block';
    document.getElementById('main-desc').style.display = 'block';
    document.getElementById('logo').style.display = 'none';
    const menuBg = document.getElementById('background-video-menu');
    const gameBg = document.getElementById('background-video-game');
    if (menuBg && gameBg) {
        menuBg.style.opacity = '1';
        gameBg.style.opacity = '0';
    }
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
    document.getElementById('music-controls').style.display = 'none';
};
document.getElementById('player-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const playerName = document.getElementById('player-name').value;
    document.getElementById('player-name-header').textContent = playerName;
    document.getElementById('player-form-container').style.display = 'none';
    document.getElementById('logo').style.display = 'none';
    document.getElementById('main-title').style.display = 'block';
    document.getElementById('main-desc').style.display = 'block';
    document.getElementById('settings-form-container').style.display = 'block';
    document.getElementById('play-button-container').style.display = 'block';
    loadCategoriesAndDifficulties();
});