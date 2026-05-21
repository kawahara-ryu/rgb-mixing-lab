// === Audio ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(f,t,d,v=0.1){if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);o.stop(audioCtx.currentTime+d);}

// エンターキー（ターン！）
function playCorrect(){
    // タイピング音
    playTone(800, 'square', 0.02, 0.05);
    setTimeout(()=>playTone(900, 'square', 0.02, 0.05), 50);
    setTimeout(()=>playTone(850, 'square', 0.02, 0.05), 100);
    // エンター（ターン！）
    setTimeout(()=>playTone(300, 'sawtooth', 0.1, 0.2), 150);
    setTimeout(()=>playTone(600, 'sine', 0.3, 0.1), 200);
}
function playWrong(){playTone(150,'sawtooth',0.3,0.2); setTimeout(()=>playTone(100,'sawtooth',0.4,0.3),100);}
function playClick(){playTone(800,'square',0.02,0.05);}
function playHeartbeat(){playTone(60,'sine',0.2,0.5); setTimeout(()=>playTone(50,'sine',0.3,0.5),200);} // 心音
function playMagic(){playTone(400,'square',0.1,0.1); setTimeout(()=>playTone(800,'square',0.2,0.1),100);} // バックドア音
function playGameOver(){playTone(150,'sawtooth',0.5,0.2);setTimeout(()=>playTone(100,'sawtooth',0.5,0.2),300);setTimeout(()=>playTone(50,'sawtooth',1.0,0.3),600);}
function playClear(){[523,587,659,698,784,880,987,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.1),i*100));}

// === 視覚ヒントの描画 ===
function drawFlasks(r, g, b, cmyk = false) {
    const box = document.getElementById('visual-hint-box');
    box.innerHTML = '';
    
    if (!cmyk) {
        // RGB
        const colors = [
            { label: 'R', val: r, hex: '#ff0000' },
            { label: 'G', val: g, hex: '#00ff00' },
            { label: 'B', val: b, hex: '#0088ff' }
        ];
        colors.forEach(c => {
            const wrap = document.createElement('div');
            const height = c.val >= 0 ? (c.val / 255 * 100) : 0;
            const shadow = c.val > 0 ? `box-shadow: 0 0 10px ${c.hex};` : '';
            wrap.innerHTML = `
                <div class="flask">
                    <div class="flask-fill" style="height: ${height}%; background: ${c.hex}; ${shadow}"></div>
                </div>
                <div class="flask-label">${c.label}</div>
            `;
            box.appendChild(wrap);
        });
    } else {
        // CMYK
        const colors = [
            { label: 'C', val: r, hex: '#00ffff' },
            { label: 'M', val: g, hex: '#ff00ff' },
            { label: 'Y', val: b, hex: '#ffff00' },
            { label: 'K', val: 0, hex: '#444444' } // 簡易表示
        ];
        colors.forEach(c => {
            const wrap = document.createElement('div');
            const height = c.val >= 0 ? (c.val / 255 * 100) : 0;
            wrap.innerHTML = `
                <div class="flask">
                    <div class="flask-fill" style="height: ${height}%; background: ${c.hex};"></div>
                </div>
                <div class="flask-label">${c.label}</div>
            `;
            box.appendChild(wrap);
        });
    }
}

function parseHintFromQuestion(qText, stage) {
    // 簡易的な問題文解析によるフラスコ表示
    if (stage === 0) { // RGB
        if (qText.includes("R(赤)」と「G(緑)」")) drawFlasks(255, 255, 0);
        else if (qText.includes("すべての光を最大")) drawFlasks(255, 255, 255);
        else if (qText.includes("すべての光を消す")) drawFlasks(0, 0, 0);
        else drawFlasks(255, 128, 64); // 適当なデフォルト
    } else if (stage === 1) { // 階調
        if (qText.includes("#FF0000")) drawFlasks(255, 0, 0);
        else if (qText.includes("#FFFFFF")) drawFlasks(255, 255, 255);
        else if (qText.includes("#000000")) drawFlasks(0, 0, 0);
        else drawFlasks(100, 150, 200);
    } else { // CMYK
        if (qText.includes("CMY")) drawFlasks(255, 255, 255, true);
        else drawFlasks(0, 0, 0, true);
    }
}


// === State ===
let currentStage = 0, totalScore = 0, mistakes = [], timerInterval = null, timeLeft = 0, isProcessing = false, qIndex = 0;
let hp = 3;
let hintUsed = false;

const screens = { 
    title: document.getElementById('screen-title'), 
    game: document.getElementById('screen-game'), 
    clear: document.getElementById('screen-clear'),
    gameover: document.getElementById('screen-gameover')
};

function startGame() { 
    playClick(); 
    currentStage=0; totalScore=0; mistakes=[]; hp=3; 
    updateHP();
    screens.title.classList.remove('active'); 
    screens.gameover.classList.remove('active'); 
    screens.game.classList.add('active'); 
    loadStage(0); 
}

function updateHP() {
    const hpBar = document.getElementById('hp-bar');
    let hearts = "";
    for(let i=0; i<3; i++) { hearts += (i < hp) ? "❤️" : "🖤"; }
    hpBar.textContent = hearts;
}

function takeDamage(damageText, isTimeout = false) {
    hp--;
    updateHP();
    playWrong();
    
    const container = document.getElementById('game-container');
    container.classList.remove('shake-screen');
    void container.offsetWidth; // reflow
    container.classList.add('shake-screen');

    if (hp <= 0) {
        setTimeout(() => { showGameOver(damageText); }, 1000); 
        return true; 
    }
    return false; 
}

function showGameOver(reason) {
    clearInterval(timerInterval);
    playGameOver();
    screens.game.classList.remove('active');
    document.getElementById('feedback-overlay').classList.add('hidden');
    document.getElementById('gameover-reason').textContent = reason + "（HPがゼロになった）";
    screens.gameover.classList.add('active');
}

function loadStage(n) {
    currentStage = n; isProcessing = false; qIndex = 0;
    clearInterval(timerInterval);
    const stages = [gameData.stage1, gameData.stage2, gameData.stage3];
    if (n >= stages.length) { showClear(); return; }
    
    const s = stages[n];
    document.getElementById('stage-title').textContent = s.title;
    document.getElementById('instruction-box').textContent = s.instruction;
    s._shuffled = [...s.questions].sort(() => Math.random() - 0.5);
    
    if (s.timePerQ > 0) {
        document.getElementById('timer').textContent = `--`;
    } else {
        document.getElementById('timer').textContent = `∞`;
    }
    showQuestion();
}

function showQuestion() {
    const stages = [gameData.stage1, gameData.stage2, gameData.stage3];
    const s = stages[currentStage];
    if (qIndex >= s._shuffled.length) {
        clearInterval(timerInterval);
        showFeedback(true, `【 プロトコル完了 】\n${s.title} のハッキングに成功した！`, () => loadStage(currentStage + 1));
        return;
    }
    const q = s._shuffled[qIndex];
    document.getElementById('counter').textContent = `ノード ${qIndex + 1} / ${s._shuffled.length}`;
    
    // フラスコヒントの描画
    parseHintFromQuestion(q.question, currentStage);
    document.getElementById('question-text').innerHTML = q.question;

    // ヒントボタンのリセット
    hintUsed = false;
    const hBtn = document.getElementById('hint-btn');
    hBtn.disabled = false;
    hBtn.classList.remove('used');
    hBtn.textContent = "💡 バックドア起動 (Time -5s)";

    const optBox = document.getElementById('options');
    optBox.innerHTML = '';
    const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
    shuffledOpts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt'; btn.textContent = opt;
        btn.onclick = () => answerQuestion(opt, q, btn);
        optBox.appendChild(btn);
    });

    isProcessing = false;
    if (s.timePerQ > 0) {
        startTimer(s.timePerQ, () => {
            isProcessing = true; totalScore -= 5;
            mistakes.push({ stage: stages[currentStage].title, question: q.question, answer: q.answer, explanation: q.explanation });
            const isDead = takeDamage("セキュリティシステムに探知された！");
            if (!isDead) {
                showFeedback(false, `【 時間切れ 】\n探知された！HP-1\n\n【システムログ】\n${q.explanation}`, () => { qIndex++; showQuestion(); });
            }
        });
    }
}

// お助け機能
function useHint() {
    if(hintUsed || isProcessing) return;
    hintUsed = true;
    playMagic();
    const hBtn = document.getElementById('hint-btn');
    hBtn.disabled = true;
    hBtn.classList.add('used');
    hBtn.textContent = "💡 バックドア（起動済）";
    
    const stages = [gameData.stage1, gameData.stage2, gameData.stage3];
    if (stages[currentStage].timePerQ > 0) {
        timeLeft -= 5;
        if(timeLeft < 0) timeLeft = 0;
        updateTimer();
    }
    
    const q = stages[currentStage]._shuffled[qIndex];
    const btns = Array.from(document.querySelectorAll('.quiz-opt'));
    const wrongBtns = btns.filter(b => b.textContent !== q.answer);
    
    wrongBtns.sort(() => Math.random() - 0.5);
    if(wrongBtns.length >= 1) wrongBtns[0].classList.add('hidden-opt');
    if(wrongBtns.length >= 2) wrongBtns[1].classList.add('hidden-opt');
}

// ハッキング（マトリックス）エフェクト
function triggerHack() {
    const el = document.getElementById('hack-effect');
    el.classList.remove('hidden');
    el.classList.remove('hack-anim');
    void el.offsetWidth; // reflow
    el.classList.add('hack-anim');
    setTimeout(() => { el.classList.add('hidden'); el.classList.remove('hack-anim'); }, 600);
}

function answerQuestion(selected, q, btn) {
    if (isProcessing) return; isProcessing = true;
    clearInterval(timerInterval);
    const stages = [gameData.stage1, gameData.stage2, gameData.stage3];
    
    if (selected === q.answer) {
        playCorrect(); 
        triggerHack(); // 正解時にマトリックスエフェクト
        btn.classList.add('correct'); totalScore += 15;
        showFeedback(true, `【 アクセス承認 】\nハッキング成功！\n\n【システムログ】\n${q.explanation}`, () => { qIndex++; showQuestion(); });
    } else {
        btn.classList.add('wrong'); totalScore -= 5;
        document.querySelectorAll('.quiz-opt').forEach(b => { if (b.textContent === q.answer) b.classList.add('correct'); });
        mistakes.push({ stage: stages[currentStage].title, question: q.question, answer: q.answer, explanation: q.explanation });
        
        const isDead = takeDamage(q.damage);
        if (!isDead) {
            showFeedback(false, `【 アクセス拒否！HP-1 】\n${q.damage}\n\n【システムログ】\n${q.explanation}`, () => { qIndex++; showQuestion(); });
        }
    }
}

function showClear() {
    playClear(); 
    screens.game.classList.remove('active'); screens.clear.classList.add('active');
    
    // 称号判定
    let rank = "";
    if (hp === 3 && mistakes.length === 0) rank = "👑 ゴッド・ハッカー";
    else if (hp === 3) rank = "💻 エリート・クラッカー";
    else if (hp === 2) rank = "⌨️ 一人前のプログラマー";
    else if (hp === 1) rank = "💦 ギリギリ逃げ切ったスクリプトキディ";
    else rank = "🗑️ バグだらけのポンコツPC";
    
    document.getElementById('rank-display').textContent = rank;
    document.getElementById('score-display').textContent = `ハッキングスコア: ${totalScore} Pt`;
    document.getElementById('password-text').textContent = gameData.password;
    
    const area = document.getElementById('review-area');
    if (!mistakes.length) { area.innerHTML = '<p class="review-perfect">一度のミスもない完璧なステルス・ハッキングだった！</p>'; return; }
    area.innerHTML = '';
    mistakes.forEach(m => { const c=document.createElement('div'); c.className='review-card'; c.innerHTML=`<div class="review-stage">${m.stage}</div><div class="review-q">Q: ${m.question}</div><div class="review-a">A: ${m.answer}</div><div class="review-exp">${m.explanation}</div>`; area.appendChild(c); });
}

function startTimer(sec, cb) { 
    timeLeft=sec; updateTimer(); clearInterval(timerInterval); 
    timerInterval=setInterval(()=>{
        timeLeft--;
        updateTimer();
        if(timeLeft <= 5 && timeLeft > 0) { playHeartbeat(); }
        if(timeLeft<=0){ clearInterval(timerInterval); if(cb)cb(); }
    },1000); 
}
function updateTimer() { const el=document.getElementById('timer'); el.textContent=`${timeLeft}`; el.className='timer-box '+(timeLeft<=5?'timer-danger':''); }
function showFeedback(ok, text, cb) { 
    const ov=document.getElementById('feedback-overlay'); 
    document.getElementById('feedback-title').textContent=ok?'◎ 承認':'✖ 拒否'; 
    document.getElementById('feedback-title').style.color=ok?'var(--success-color)':'var(--danger-color)'; 
    document.getElementById('feedback-text').innerHTML = text.replace(/\n/g, '<br>'); 
    document.getElementById('next-btn').textContent = ok ? '次へ進む ▶' : 'ダメージを堪えて進む ▶';
    document.getElementById('next-btn').style.borderColor = ok ? 'var(--success-color)' : 'var(--danger-color)';
    document.getElementById('next-btn').style.color = ok ? 'var(--success-color)' : 'var(--danger-color)';
    ov.classList.remove('hidden'); ov._cb=cb; 
}
function closeFeedback() { playClick(); document.getElementById('feedback-overlay').classList.add('hidden'); const ov=document.getElementById('feedback-overlay'); if(ov._cb)ov._cb(); }
