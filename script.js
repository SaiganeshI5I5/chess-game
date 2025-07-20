/* ===== Enhanced Chess Game with Timer & Music ===== */

/* ---------- Board state ---------- */
const board = [];        // 8×8 array of {type,color}
const moveHistory = [];  // [{moveText,timeSpent,player}]
let selectedPiece = null;
let currentPlayer  = "white";
let gameStatusText;

/* Unicode piece symbols */
const symbols = {
  white: {K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙"},
  black: {K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"}
};

/* ---------- Board setup / rendering ---------- */
function initBoardArray(){
  board.length = 0;
  for(let r=0;r<8;r++) board.push(new Array(8).fill(null));
  const back = ["R","N","B","Q","K","B","N","R"];
  for(let c=0;c<8;c++){
    board[7][c] = {type:back[c], color:"white"};
    board[6][c] = {type:"P",       color:"white"};
    board[1][c] = {type:"P",       color:"black"};
    board[0][c] = {type:back[c],   color:"black"};
  }
}

function renderBoard(){
  const boardEl = document.getElementById("chessBoard");
  boardEl.innerHTML = "";
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = document.createElement("div");
      sq.className = "square " + ((r+c)%2===0?"light":"dark");
      sq.dataset.row = r; sq.dataset.col = c;
      const piece = board[r][c];
      if(piece){
        const span = document.createElement("span");
        span.className = "piece";
        span.textContent = symbols[piece.color][piece.type];
        sq.appendChild(span);
      }
      sq.addEventListener("click", onSquareClick);
      boardEl.appendChild(sq);
    }
  }
}

/* ---------- Move handling ---------- */
function onSquareClick(e){
  const row = +e.currentTarget.dataset.row;
  const col = +e.currentTarget.dataset.col;
  const clicked = board[row][col];

  if(selectedPiece){
    if(isValidMove(selectedPiece, {row,col})){
      movePiece(selectedPiece, {row,col});
      endTurn();
    }
    clearHighlights();
    selectedPiece = null;
  } else {
    if(clicked && clicked.color === currentPlayer){
      selectedPiece = {row,col,piece:clicked};
      highlightValidMoves(selectedPiece);
    }
  }
}

function isValidMove(from, to){
  const p = from.piece, dr = to.row - from.row, dc = to.col - from.col;

  switch(p.type){
    case "P":
      if(p.color==="white"){
        if(dr===-1 && dc===0 && !board[to.row][to.col]) return true;
        if(from.row===6 && dr===-2 && dc===0 && !board[5][to.col] && !board[4][to.col]) return true;
        if(dr===-1 && Math.abs(dc)===1 && board[to.row][to.col] && board[to.row][to.col].color==="black") return true;
      } else {
        if(dr===1 && dc===0 && !board[to.row][to.col]) return true;
        if(from.row===1 && dr===2 && dc===0 && !board[2][to.col] && !board[3][to.col]) return true;
        if(dr===1 && Math.abs(dc)===1 && board[to.row][to.col] && board[to.row][to.col].color==="white") return true;
      }
      break;
    case "R": if(dr===0||dc===0) return clearPath(from,to); break;
    case "B": if(Math.abs(dr)===Math.abs(dc)) return clearPath(from,to); break;
    case "Q": if(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)) return clearPath(from,to); break;
    case "N": if((Math.abs(dr)===2&&Math.abs(dc)===1)||(Math.abs(dr)===1&&Math.abs(dc)===2)) return true; break;
    case "K": if(Math.abs(dr)<=1&&Math.abs(dc)<=1) return true; break;
  }
  return false;
}
function clearPath(from,to){
  const rs = Math.sign(to.row-from.row), cs = Math.sign(to.col-from.col);
  let r = from.row+rs, c = from.col+cs;
  while(r!==to.row || c!==to.col){
    if(board[r][c]) return false;
    r+=rs; c+=cs;
  }
  return true;
}

function movePiece(from,to){
  board[to.row][to.col]   = from.piece;
  board[from.row][from.col]=null;
  addMoveToHistory(from,to);
  renderBoard();
}

function highlightValidMoves(sel){
  document.querySelectorAll(".square").forEach(sq=>{
    const r=+sq.dataset.row, c=+sq.dataset.col;
    if(isValidMove(sel,{row:r,col:c})) sq.classList.add("valid-move");
  });
}
function clearHighlights(){ document.querySelectorAll(".valid-move").forEach(el=>el.classList.remove("valid-move")); }

/* ---------- Move history ---------- */
function addMoveToHistory(from,to){
  const text = `${symbols[currentPlayer][from.piece.type]} ${String.fromCharCode(97+from.col)}${8-from.row}→${String.fromCharCode(97+to.col)}${8-to.row}`;
  const spent = currentPlayer==="white"?whiteMoveTime:blackMoveTime;
  moveHistory.push({moveText:text,timeSpent:spent,player:currentPlayer});
  renderMoveHistory();
}
function renderMoveHistory(){
  const el = document.getElementById("moveHistory");
  el.innerHTML="";
  moveHistory.forEach((m,i)=>{
    const div=document.createElement("div");
    div.className=`move-entry ${m.player}-move`;
    div.innerHTML=`<span class="move-text">${i+1}. ${m.moveText}</span><span class="move-time">(${formatTime(m.timeSpent)})</span>`;
    el.appendChild(div);
  });
  el.scrollTop = el.scrollHeight;
}

/* ---------- Timers ---------- */
let whiteTime=600, blackTime=600, increment=0, activeTimer=null;
let whiteMoveTime=0, blackMoveTime=0, moveStart=0;

function startTimers(base,inc){
  whiteTime=blackTime=base; increment=inc;
  updateTimerDisplays(); currentPlayer="white";
  moveStart=Date.now(); highlightActiveTimer();
  if(activeTimer) clearInterval(activeTimer);
  activeTimer=setInterval(()=>{
    const now=Date.now(), elapsed=Math.floor((now-moveStart)/1000);
    if(currentPlayer==="white"){ whiteMoveTime=elapsed; updateWhiteDisplay(); }
    else                        { blackMoveTime=elapsed; updateBlackDisplay(); }
  },200);
}

function endTurn(){
  const now=Date.now(), elapsed=Math.floor((now-moveStart)/1000);
  if(currentPlayer==="white"){
    whiteTime-=elapsed; whiteTime+=increment; whiteMoveTime=elapsed;
    if(whiteTime<=0) return gameOver("Black wins on time!");
    currentPlayer="black";
  }else{
    blackTime-=elapsed; blackTime+=increment; blackMoveTime=elapsed;
    if(blackTime<=0) return gameOver("White wins on time!");
    currentPlayer="white";
  }
  moveStart=Date.now(); whiteMoveTime=blackMoveTime=0;
  updateTimerDisplays(); highlightActiveTimer();
  gameStatusText.textContent=`${capitalize(currentPlayer)} to move`;
}

function updateTimerDisplays(){ updateWhiteDisplay(); updateBlackDisplay(); }
function updateWhiteDisplay(){
  const el=document.getElementById("whiteTime");
  el.textContent=formatTime(whiteTime-whiteMoveTime);
  toggleLowTime(el.parentElement, whiteTime-whiteMoveTime);
}
function updateBlackDisplay(){
  const el=document.getElementById("blackTime");
  el.textContent=formatTime(blackTime-blackMoveTime);
  toggleLowTime(el.parentElement, blackTime-blackMoveTime);
}
function toggleLowTime(timerEl,remain){
  timerEl.classList.toggle("low-time",remain<=30);
}
function highlightActiveTimer(){
  document.querySelector(".white-timer").classList.toggle("active",currentPlayer==="white");
  document.querySelector(".black-timer").classList.toggle("active",currentPlayer==="black");
}
function formatTime(s){
  const m=Math.floor(s/60).toString().padStart(2,"0");
  const t=Math.max(0,s%60).toString().padStart(2,"0");
  return `${m}:${t}`;
}
function pauseGame(){ if(activeTimer){clearInterval(activeTimer); activeTimer=null;}else resumeGame(); }
function resumeGame(){
  moveStart=Date.now();
  activeTimer=setInterval(()=>{ endTurn(); },1000);
}
function resetGame(){ location.reload(); }
function gameOver(msg){ if(activeTimer) clearInterval(activeTimer); alert(msg); }
function capitalize(s){ return s[0].toUpperCase()+s.slice(1); }

/* ---------- Audio ---------- */
const musicAudio   = new Audio("audio/background-music.mp3");
const moveSound    = new Audio("audio/move-sound.mp3");
const captureSound = new Audio("audio/capture-sound.mp3");
const checkSound   = new Audio("audio/check-sound.mp3");
const mateSound    = new Audio("audio/checkmate-sound.mp3");
let effectsMuted = false;

function initAudio(){
  const musicToggle  = document.getElementById("musicToggle");
  const musicVolume  = document.getElementById("musicVolume");
  const effectsToggle= document.getElementById("effectsToggle");
  const masterVolume = document.getElementById("masterVolume");

  musicToggle.onclick = ()=>{
    if(musicAudio.paused){
      musicAudio.volume = musicVolume.value/100;
      musicAudio.loop=true; musicAudio.play();
      musicToggle.textContent="⏸ Pause"; musicToggle.classList.remove("paused");
    }else{
      musicAudio.pause(); musicToggle.textContent="▶ Play"; musicToggle.classList.add("paused");
    }
  };
  musicVolume.oninput = ()=>{ musicAudio.volume = musicVolume.value/100; };
  effectsToggle.onclick = ()=>{
    effectsMuted=!effectsMuted;
    effectsToggle.textContent = effectsMuted?"🔇 Off":"🔊 On";
    effectsToggle.classList.toggle("muted",effectsMuted);
  };
  masterVolume.oninput = ()=>{
    const v = masterVolume.value/100;
    musicAudio.volume = v;
    [moveSound,captureSound,checkSound,mateSound].forEach(a=>a.volume=v);
  };
}
function playMoveSound(){ if(!effectsMuted) moveSound.play(); }
function playCaptureSound(){ if(!effectsMuted) captureSound.play(); }
function playCheckSound(){ if(!effectsMuted) checkSound.play(); }
function playMateSound(){ if(!effectsMuted) mateSound.play(); }

/* ---------- Init ---------- */
window.addEventListener("DOMContentLoaded",()=>{
  gameStatusText = document.getElementById("gameStatus");
  initBoardArray(); renderBoard(); initAudio();

  const modal = document.getElementById("timeControlModal");
  const container = document.getElementById("gameContainer");

  document.querySelectorAll(".time-btn").forEach(btn=>{
    btn.onclick = ()=>{
      const base=+btn.dataset.time, inc=+btn.dataset.increment;
      modal.style.display="none"; container.style.display="block";
      startTimers(base,inc);
    };
  });
  document.getElementById("customTimeBtn").onclick = ()=>{
    const base=+document.getElementById("customMinutes").value*60;
    const inc =+document.getElementById("customIncrement").value;
    modal.style.display="none"; container.style.display="block";
    startTimers(base,inc);
  };

  document.getElementById("pauseBtn").onclick = pauseGame;
  document.getElementById("resetBtn").onclick = resetGame;
});
