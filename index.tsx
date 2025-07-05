// --- TYPE DEFINITIONS ---
interface QuestionRef {
    element: HTMLElement;
    originalParent: HTMLElement;
    originalNextSibling: Node | null;
}

// --- STATE ---
let allQuestions: QuestionRef[] = [];
let currentQuestionIndex = 0;
let currentMode: 'list' | 'single' | 'exam' = 'list';

// --- DOM ELEMENT CACHE ---
let singleQuestionContainer: HTMLElement | null;
let questionProgress: HTMLElement | null;
let prevQuestionBtn: HTMLButtonElement | null;
let nextQuestionBtn: HTMLButtonElement | null;
let fabControls: HTMLElement | null;

// --- CORE LOGIC ---

/**
 * Switches the view mode of the application.
 * @param newMode The mode to switch to: 'list', 'single', or 'exam'.
 */
function switchMode(newMode: 'list' | 'single' | 'exam'): void {
    if (currentMode === newMode) return;

    currentMode = newMode;
    document.body.dataset.viewMode = newMode;

    // Update active button state
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.getAttribute('data-mode') === newMode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (newMode === 'list') {
        restoreListView();
    } else {
        renderSingleQuestion(currentQuestionIndex);
    }
}

/**
 * Renders a single question in the single/exam view.
 * @param index The index of the question to render from the allQuestions array.
 */
function renderSingleQuestion(index: number): void {
    if (!singleQuestionContainer || !questionProgress || !prevQuestionBtn || !nextQuestionBtn || allQuestions.length === 0) return;

    // Clear previous question
    singleQuestionContainer.innerHTML = '';

    // Append the new question
    currentQuestionIndex = index;
    const questionToShow = allQuestions[index];
    singleQuestionContainer.appendChild(questionToShow.element);

    // Update progress indicator
    questionProgress.textContent = `Soru ${index + 1} / ${allQuestions.length}`;

    // Update navigation buttons
    prevQuestionBtn.disabled = index === 0;
    nextQuestionBtn.disabled = index === allQuestions.length - 1;
}

/**
 * Restores all question elements to their original positions in the list view.
 */
function restoreListView(): void {
    if (singleQuestionContainer) {
        singleQuestionContainer.innerHTML = '';
    }
    allQuestions.forEach(q => {
        q.originalParent.insertBefore(q.element, q.originalNextSibling);
    });
}


// --- EVENT HANDLERS ---

function handleOptionClick(event: MouseEvent): void {
    const option = event.currentTarget as HTMLLIElement;
    const question = option.closest('.question') as HTMLElement;

    if (!question || question.dataset.answered === 'true' || option.classList.contains('user-incorrect')) {
        return;
    }

    const isCorrect = option.classList.contains('correct');
    let attempts = parseInt(question.dataset.attempts || '0', 10);
    attempts++;
    question.dataset.attempts = attempts.toString();

    if (isCorrect) {
        option.classList.add('user-correct');
        question.dataset.answered = 'true';
        question.querySelectorAll('.option').forEach(opt => opt.setAttribute('disabled', 'true'));
        revealExplanation(question);
    } else {
        option.classList.add('user-incorrect');
        option.setAttribute('disabled', 'true'); // Disable wrong option
        if (attempts >= 2) {
            question.dataset.answered = 'true';
            const correctOption = question.querySelector('.option.correct');
            if (correctOption) {
                correctOption.classList.add('revealed-answer');
            }
            question.querySelectorAll('.option').forEach(opt => {
                if (!opt.hasAttribute('disabled')) {
                    opt.setAttribute('disabled', 'true');
                }
            });
            revealExplanation(question);
        }
    }
}

function showExplanation(button: HTMLButtonElement): void {
    const explanation = button.nextElementSibling as HTMLElement;
    if (explanation) {
        if (explanation.style.display === 'none' || explanation.style.display === '') {
            explanation.style.display = 'block';
            explanation.style.animation = 'fadeIn 0.5s ease-in-out';
            button.textContent = 'Açıklamayı Gizle';
            button.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        } else {
            explanation.style.display = 'none';
            button.textContent = 'Açıklamayı Göster';
            button.style.background = 'linear-gradient(135deg, #27ae60, #229954)';
        }
    }
}

function revealExplanation(question: HTMLElement): void {
    const button = question.querySelector('.show-answer-btn') as HTMLButtonElement;
    if (button) {
        const explanation = button.nextElementSibling as HTMLElement;
        if (explanation && (explanation.style.display === 'none' || explanation.style.display === '')) {
            showExplanation(button);
        }
    }
}

function toggleWeek(weekNumber: string | number): void {
    const content = document.getElementById(`week-${weekNumber}`);
    const icon = document.getElementById(`icon-${weekNumber}`);
    
    if (content && icon) {
        content.classList.toggle('active');
        icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

function expandAll(): void {
    if (currentMode !== 'list') return;
    document.querySelectorAll('.week-content').forEach(content => content.classList.add('active'));
    document.querySelectorAll('.toggle-icon').forEach(icon => {
        (icon as HTMLElement).style.transform = 'rotate(180deg)';
    });
}

function collapseAll(): void {
    if (currentMode !== 'list') return;
    document.querySelectorAll('.week-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.toggle-icon').forEach(icon => {
        (icon as HTMLElement).style.transform = 'rotate(0deg)';
    });
}

function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', function() {
    // --- Cache DOM elements ---
    singleQuestionContainer = document.getElementById('single-question-container');
    questionProgress = document.getElementById('question-progress');
    prevQuestionBtn = document.getElementById('prev-question-btn') as HTMLButtonElement;
    nextQuestionBtn = document.getElementById('next-question-btn') as HTMLButtonElement;
    fabControls = document.getElementById('fab-controls');
    const fabMainBtn = document.getElementById('fab-main-btn');
    const headerEl = document.querySelector('header');
    const headerToggleBtn = document.getElementById('header-toggle-btn');

    // --- Populate question references ---
    document.querySelectorAll('.question').forEach(q => {
        const questionElement = q as HTMLElement;
        allQuestions.push({
            element: questionElement,
            originalParent: questionElement.parentElement as HTMLElement,
            originalNextSibling: questionElement.nextSibling,
        });
        // Initialize question state
        questionElement.dataset.attempts = '0';
        questionElement.dataset.answered = 'false';
    });
    
    // --- Update Dynamic Stats ---
    const totalQuestionsEl = document.getElementById('total-questions');
    const totalWeeksEl = document.getElementById('total-weeks');
    
    console.log('Found questions:', allQuestions.length);
    console.log('Total questions element:', totalQuestionsEl);
    
    if (totalQuestionsEl) totalQuestionsEl.textContent = allQuestions.length.toString();
    if (totalWeeksEl) {
        const weekSections = document.querySelectorAll('.week-section:not(:has(#week-summary))');
        console.log('Found week sections:', weekSections.length);
        totalWeeksEl.textContent = weekSections.length.toString();
    }


    // --- Attach Event Listeners ---
    if (headerEl && headerToggleBtn) {
        headerToggleBtn.addEventListener('click', () => {
            headerEl.classList.toggle('collapsed');
        });
    }

    document.querySelectorAll<HTMLElement>('.week-header').forEach(header => {
        header.addEventListener('click', () => {
            const weekId = header.dataset.week;
            if (weekId) toggleWeek(weekId);
        });
    });

    document.querySelectorAll<HTMLButtonElement>('.show-answer-btn').forEach(button => {
        button.addEventListener('click', (event) => showExplanation(event.currentTarget as HTMLButtonElement));
    });
    
    document.querySelectorAll<HTMLLIElement>('.option').forEach(option => {
        option.addEventListener('click', handleOptionClick as EventListener);
    });

    // FAB Controls Logic
    fabMainBtn?.addEventListener('click', () => {
        fabControls?.classList.toggle('menu-open');
    });

    document.querySelectorAll<HTMLButtonElement>('.fab-action').forEach(button => {
        button.addEventListener('click', () => {
            const controlAction = button.dataset.control;
            if (controlAction === 'expand-all') expandAll();
            else if (controlAction === 'collapse-all') collapseAll();
            else if (controlAction === 'scroll-top') scrollToTop();
            
            // Close menu after action
            fabControls?.classList.remove('menu-open');
        });
    });


    document.querySelectorAll<HTMLButtonElement>('.mode-btn').forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode as 'list' | 'single' | 'exam';
            if (mode) switchMode(mode);
        });
    });

    if (prevQuestionBtn) {
        prevQuestionBtn.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                renderSingleQuestion(currentQuestionIndex - 1);
            }
        });
    }

    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', () => {
            if (currentQuestionIndex < allQuestions.length - 1) {
                renderSingleQuestion(currentQuestionIndex + 1);
            }
        });
    }

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'e') { e.preventDefault(); expandAll(); } 
        else if (e.ctrlKey && e.key === 'c') { e.preventDefault(); collapseAll(); } 
        else if (e.key === 'Home') { e.preventDefault(); scrollToTop(); }
    });
    
    // --- Initial State ---
    if (document.querySelector('#week-1')) {
        toggleWeek(1); // Open first week by default
    }
    document.documentElement.style.scrollBehavior = 'smooth';
});