// ============================================================
// SAVARI LUDO
// Firebase Realtime Multiplayer
// 15 x 15 Board / 52 Path Cells
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyALjjBvSRi37TEVKbUTXRKRQ90e07kcNgA",
  authDomain: "savari-ludo.firebaseapp.com",
  databaseURL:
    "https://savari-ludo-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "savari-ludo",
  storageBucket: "savari-ludo.firebasestorage.app",
  messagingSenderId: "882276906132",
  appId: "1:882276906132:web:64f21c73ebce582a447081"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ============================================================
// ROOM
// ============================================================

const params = new URLSearchParams(location.search);

const ROOM_ID =
  params.get("room") ||
  "DEFAULT";

const roomRef = ref(db, `rooms/${ROOM_ID}`);

const playersRef = ref(
  db,
  `rooms/${ROOM_ID}/players`
);

const gameRef = ref(
  db,
  `rooms/${ROOM_ID}/game`
);

const piecesRef = ref(
  db,
  `rooms/${ROOM_ID}/pieces`
);


// ============================================================
// ELEMENT
// ============================================================

const board =
  document.getElementById("board");

const piecesLayer =
  document.getElementById("pieces-layer");

const diceEl =
  document.getElementById("dice");

const rollBtn =
  document.getElementById("rollBtn");

const playersEl =
  document.getElementById("players");

const statusEl =
  document.getElementById("status");

const messageEl =
  document.getElementById("message");

const roomIdEl =
  document.getElementById("roomId");

roomIdEl.textContent = ROOM_ID;


// ============================================================
// PLAYER ID
// ============================================================

let playerId =
  localStorage.getItem("savari_ludo_player_id");

if (!playerId) {

  playerId =
    "P_" +
    Math.random()
      .toString(36)
      .substring(2, 10) +
    "_" +
    Date.now();

  localStorage.setItem(
    "savari_ludo_player_id",
    playerId
  );
}


// ============================================================
// COLORS
// ============================================================

const COLORS = [
  "red",
  "blue",
  "green",
  "yellow"
];


// ============================================================
// 52 KOTAK JALUR
//
// Semua koordinat memakai:
// [row, column]
//
// row    = 1..15
// column = 1..15
//
// Titik tengah kotak dihitung:
// left = (column - 0.5) / 15 * 100
// top  = (row - 0.5) / 15 * 100
// ============================================================

const PATH = [

  // RED START
  [8,2],
  [8,3],
  [8,4],
  [8,5],
  [8,6],

  [7,6],
  [6,6],
  [5,6],
  [4,6],
  [3,6],
  [2,6],
  [1,6],
  [1,7],

  // TOP
  [1,8],
  [1,9],

  [2,9],
  [3,9],
  [4,9],
  [5,9],
  [6,9],

  [7,10],

  // RIGHT
  [8,10],
  [8,11],
  [8,12],
  [8,13],
  [8,14],

  [8,15],

  [9,15],

  [9,14],
  [9,13],
  [9,12],
  [9,11],
  [9,10],

  [10,9],
  [11,9],
  [12,9],
  [13,9],
  [14,9],
  [15,9],

  // BOTTOM
  [15,8],
  [15,7],
  [15,6],

  [14,6],
  [13,6],
  [12,6],
  [11,6],
  [10,6],

  [9,5],
  [9,4],
  [9,3],
  [9,2],
  [9,1],

  // BACK TO RED
  [8,1]
];


// Pastikan tepat 52
console.log(
  "[LUDO] PATH:",
  PATH.length,
  "cells"
);


// ============================================================
// TITIK MULAI WARNA
// ============================================================

const START = {

  red: 0,

  blue: 13,

  green: 26,

  yellow: 39

};


// ============================================================
// POSISI HOME
//
// row,column
// ============================================================

const HOME = {

  red: [
    [3,3],
    [5,3],
    [3,5],
    [5,5]
  ],

  blue: [
    [3,11],
    [5,11],
    [3,13],
    [5,13]
  ],

  green: [
    [11,3],
    [13,3],
    [11,5],
    [13,5]
  ],

  yellow: [
    [11,11],
    [13,11],
    [11,13],
    [13,13]
  ]

};


// ============================================================
// STATE
// ============================================================

let myColor = null;

let currentGame = {
  turn: "red",
  dice: 0,
  rolling: false,
  winner: null
};

let players = {};

let pieces = {};

let pieceElements = {};


// ============================================================
// UTIL
// ============================================================

function randomName() {

  return "Player-" +
    playerId
      .replace("P_", "")
      .substring(0, 4)
      .toUpperCase();

}


function cellPercent(row, col) {

  return {

    left:
      ((col - 0.5) / 15) * 100,

    top:
      ((row - 0.5) / 15) * 100

  };

}


function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}


// ============================================================
// PIECE ID
// ============================================================

function makePieceId(color, index) {

  return `${color}_${index}`;

}


// ============================================================
// CREATE PIECE ELEMENT
// ============================================================

function createPiece(
  pieceId,
  color,
  index
) {

  if (pieceElements[pieceId]) {
    return pieceElements[pieceId];
  }

  const piece =
    document.createElement("div");

  piece.className =
    `piece ${color}`;

  piece.dataset.piece =
    pieceId;

  piece.dataset.color =
    color;

  piece.dataset.index =
    index;

  piece.title =
    `${color.toUpperCase()} ${index + 1}`;

  piece.addEventListener(
    "click",
    () => {

      movePiece(
        pieceId
      );

    }
  );

  piecesLayer.appendChild(piece);

  pieceElements[pieceId] =
    piece;

  return piece;

}


// ============================================================
// SET PIECE POSITION
// ============================================================

function setPiecePosition(
  pieceId,
  color,
  index,
  position,
  animate = false
) {

  const piece =
    createPiece(
      pieceId,
      color,
      index
    );

  let row;
  let col;

  /*
   * -1 = HOME
   */

  if (
    position === undefined ||
    position === null ||
    position < 0
  ) {

    [row, col] =
      HOME[color][index];

  }

  /*
   * 0..51 = PATH
   */

  else if (
    position >= 0 &&
    position < PATH.length
  ) {

    [row, col] =
      PATH[
        (START[color] + position) %
        PATH.length
      ];

  }

  /*
   * 52 = FINISH
   */

  else {

    /*
     * Finish ditaruh di tengah.
     */

    row = 8;
    col = 8;

  }

  const pos =
    cellPercent(
      row,
      col
    );

  if (animate) {

    piece.style.transition =
      "left .18s linear, top .18s linear, transform .12s ease";

  } else {

    piece.style.transition =
      "none";

  }

  piece.style.left =
    `${pos.left}%`;

  piece.style.top =
    `${pos.top}%`;

}


// ============================================================
// RENDER ALL PIECES
// ============================================================

function renderPieces(
  data
) {

  if (!data) {
    return;
  }

  pieces =
    data;

  Object.entries(
    pieces
  ).forEach(
    ([pieceId, pieceData]) => {

      if (!pieceData) {
        return;
      }

      const color =
        pieceData.color;

      const index =
        Number(pieceData.index);

      const position =
        Number(pieceData.position ?? -1);

      setPiecePosition(
        pieceId,
        color,
        index,
        position,
        true
      );

    }
  );

  updateSelectablePieces();

}


// ============================================================
// ANIMATE ONE STEP
// ============================================================

async function animateOneStep(
  pieceId,
  color,
  index,
  from,
  to
) {

  /*
   * Home -> start
   */

  if (from < 0) {

    setPiecePosition(
      pieceId,
      color,
      index,
      to,
      true
    );

    await sleep(220);

    return;
  }

  /*
   * Normal movement
   */

  let position =
    from;

  while (
    position < to
  ) {

    position++;

    setPiecePosition(
      pieceId,
      color,
      index,
      position,
      true
    );

    await sleep(210);

  }

}


// ============================================================
// SYNC PIECES DENGAN ANIMASI
// ============================================================

async function syncPieceMovement(
  oldPieces,
  newPieces
) {

  if (!oldPieces) {
    renderPieces(
      newPieces
    );
    return;
  }

  for (
    const [pieceId, newData]
    of Object.entries(newPieces || {})
  ) {

    const oldData =
      oldPieces[pieceId];

    if (!newData) {
      continue;
    }

    const oldPosition =
      Number(
        oldData?.position ?? -1
      );

    const newPosition =
      Number(
        newData?.position ?? -1
      );

    if (
      oldPosition ===
      newPosition
    ) {

      continue;

    }

    await animateOneStep(
      pieceId,
      newData.color,
      Number(newData.index),
      oldPosition,
      newPosition
    );

  }

}


// ============================================================
// UPDATE SELECTABLE
// ============================================================

function updateSelectablePieces() {

  Object.entries(
    pieceElements
  ).forEach(
    ([pieceId, element]) => {

      element.classList.remove(
        "selectable"
      );

    }
  );

  if (!myColor) {
    return;
  }

  if (
    currentGame.turn !==
    myColor
  ) {
    return;
  }

  if (
    !currentGame.dice ||
    currentGame.dice <= 0
  ) {
    return;
  }

  Object.entries(
    pieces
  ).forEach(
    ([pieceId, data]) => {

      if (
        data.color !==
        myColor
      ) {
        return;
      }

      const position =
        Number(
          data.position ?? -1
        );

      /*
       * Home hanya bisa keluar
       * jika mendapat angka 6.
       */

      if (
        position < 0 &&
        currentGame.dice !== 6
      ) {
        return;
      }

      /*
       * Sudah finish.
       */

      if (
        position >= 52
      ) {
        return;
      }

      const element =
        pieceElements[pieceId];

      if (element) {

        element.classList.add(
          "selectable"
        );

      }

    }
  );

}


// ============================================================
// MOVE PIECE
// ============================================================

async function movePiece(
  pieceId
) {

  if (!myColor) {
    return;
  }

  if (
    currentGame.turn !==
    myColor
  ) {
    return;
  }

  const dice =
    Number(
      currentGame.dice
    );

  if (
    dice <= 0
  ) {
    return;
  }

  const piece =
    pieces[pieceId];

  if (!piece) {
    return;
  }

  if (
    piece.color !==
    myColor
  ) {
    return;
  }

  const oldPosition =
    Number(
      piece.position ?? -1
    );

  /*
   * HOME
   */

  if (
    oldPosition < 0
  ) {

    if (
      dice !== 6
    ) {

      setMessage(
        "Pion keluar dari rumah hanya dengan angka 6."
      );

      return;

    }

    /*
     * Keluar ke posisi 0.
     */

    await set(
      ref(
        db,
        `rooms/${ROOM_ID}/pieces/${pieceId}/position`
      ),
      0
    );

    await finishTurn(
      dice === 6
    );

    return;
  }

  /*
   * SUDAH FINISH
   */

  if (
    oldPosition >= 52
  ) {
    return;
  }

  const newPosition =
    oldPosition + dice;

  /*
   * Jika melewati 52,
   * tidak boleh bergerak.
   */

  if (
    newPosition > 52
  ) {

    setMessage(
      "Langkah melebihi garis finish."
    );

    return;

  }

  /*
   * UPDATE POSISI KE FIREBASE.
   */

  await set(
    ref(
      db,
      `rooms/${ROOM_ID}/pieces/${pieceId}/position`
    ),
    newPosition
  );

  /*
   * 52 = FINISH
   */

  if (
    newPosition === 52
  ) {

    setMessage(
      `${myColor.toUpperCase()} berhasil finish!`
    );

  }

  /*
   * Jika 6 dapat giliran lagi.
   */

  await finishTurn(
    dice === 6
  );

}


// ============================================================
// FINISH TURN
// ============================================================

async function finishTurn(
  extraTurn
) {

  if (!myColor) {
    return;
  }

  const nextTurn =
    extraTurn
      ? myColor
      : getNextColor(
          myColor
        );

  await update(
    gameRef,
    {
      turn:
        nextTurn,

      dice:
        0,

      rolling:
        false
    }
  );

}


// ============================================================
// NEXT COLOR
// ============================================================

function getNextColor(
  color
) {

  const index =
    COLORS.indexOf(
      color
    );

  return COLORS[
    (index + 1) %
    COLORS.length
  ];

}


// ============================================================
// DICE
// ============================================================

const diceFaces = {

  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅"

};


let rollingLocal =
  false;


// ============================================================
// ROLL DICE
// ============================================================

async function rollDice() {

  if (rollingLocal) {
    return;
  }

  if (!myColor) {

    setMessage(
      "Kamu belum mendapat warna pemain."
    );

    return;

  }

  if (
    currentGame.turn !==
    myColor
  ) {

    setMessage(
      `Sekarang giliran ${currentGame.turn.toUpperCase()}.`
    );

    return;

  }

  if (
    currentGame.dice > 0
  ) {

    setMessage(
      "Pilih pion terlebih dahulu."
    );

    return;

  }

  rollingLocal =
    true;

  rollBtn.disabled =
    true;

  /*
   * Animasi dadu lokal.
   */

  for (
    let i = 0;
    i < 8;
    i++
  ) {

    const random =
      Math.floor(
        Math.random() * 6
      ) + 1;

    diceEl.textContent =
      diceFaces[random];

    await sleep(70);

  }

  const result =
    Math.floor(
      Math.random() * 6
    ) + 1;

  diceEl.textContent =
    diceFaces[result];

  /*
   * Firebase menjadi sumber utama.
   */

  await update(
    gameRef,
    {
      dice:
        result,

      rolling:
        false
    }
  );

  rollingLocal =
    false;

  rollBtn.disabled =
    false;

}


// ============================================================
// BUTTON
// ============================================================

if (rollBtn) {

  rollBtn.addEventListener(
    "click",
    rollDice
  );

}


// ============================================================
// JOIN ROOM
// ============================================================

async function joinRoom() {

  statusEl.textContent =
    "Joining room...";

  const playerRef =
    ref(
      db,
      `rooms/${ROOM_ID}/players/${playerId}`
    );

  await runTransaction(
    playersRef,
    current => {

      const data =
        current || {};

      /*
       * Kalau player sudah ada,
       * pertahankan warna.
       */

      if (
        data[playerId]
      ) {

        return data;

      }

      /*
       * Cari warna kosong.
       */

      const usedColors =
        Object.values(
          data
        )
        .map(
          player =>
            player.color
        );

      const freeColor =
        COLORS.find(
          color =>
            !usedColors.includes(
              color
            )
        );

      /*
       * Room penuh.
       */

      if (!freeColor) {
        return data;
      }

      data[playerId] = {

        id:
          playerId,

        name:
          randomName(),

        color:
          freeColor,

        joinedAt:
          Date.now()

      };

      return data;

    }
  );

  /*
   * Ambil data player sendiri.
   */

  onValue(
    playerRef,
    snapshot => {

      const data =
        snapshot.val();

      if (data) {

        myColor =
          data.color;

        statusEl.textContent =
          `Kamu: ${myColor.toUpperCase()}`;

        updateSelectablePieces();

      }

    }
  );

}


// ============================================================
// INITIALIZE GAME
// ============================================================

async function initializeGame() {

  /*
   * Buat room/game jika belum ada.
   */

  await runTransaction(
    gameRef,
    current => {

      if (current) {
        return current;
      }

      return {

        turn:
          "red",

        dice:
          0,

        rolling:
          false,

        winner:
          null

      };

    }
  );

  /*
   * Buat 16 pion jika belum ada.
   */

  await runTransaction(
    piecesRef,
    current => {

      if (
        current &&
        Object.keys(current).length
      ) {

        return current;

      }

      const initial =
        {};

      COLORS.forEach(
        color => {

          for (
            let i = 0;
            i < 4;
            i++
          ) {

            const id =
              makePieceId(
                color,
                i
              );

            initial[id] = {

              id,

              color,

              index:
                i,

              position:
                -1

            };

          }

        }
      );

      return initial;

    }
  );

}


// ============================================================
// PLAYERS LISTENER
// ============================================================

onValue(
  playersRef,
  snapshot => {

    players =
      snapshot.val() ||
      {};

    renderPlayers();

    /*
     * Cek apakah player sudah
     * mendapatkan warna.
     */

    const mine =
      players[playerId];

    if (mine) {

      myColor =
        mine.color;

      statusEl.textContent =
        `Kamu: ${myColor.toUpperCase()}`;

    }

    updateSelectablePieces();

  }
);


// ============================================================
// RENDER PLAYERS
// ============================================================

function renderPlayers() {

  playersEl.innerHTML =
    "";

  const entries =
    Object.values(
      players
    );

  if (!entries.length) {

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "player";

    empty.textContent =
      "Menunggu pemain...";

    playersEl.appendChild(
      empty
    );

    return;

  }

  entries.forEach(
    player => {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "player";

      div.textContent =
        `${getColorEmoji(player.color)} ${player.name} • ${player.color}`;

      playersEl.appendChild(
        div
      );

    }
  );

}


// ============================================================
// COLOR EMOJI
// ============================================================

function getColorEmoji(
  color
) {

  const icons = {

    red: "🔴",

    blue: "🔵",

    green: "🟢",

    yellow: "🟡"

  };

  return icons[color] ||
    "⚪";

}


// ============================================================
// GAME LISTENER
// ============================================================

onValue(
  gameRef,
  snapshot => {

    const data =
      snapshot.val();

    if (!data) {
      return;
    }

    currentGame =
      data;

    const dice =
      Number(
        data.dice || 0
      );

    if (dice > 0) {

      diceEl.textContent =
        diceFaces[dice];

    } else {

      diceEl.textContent =
        "🎲";

    }

    updateTurn();

    updateSelectablePieces();

  }
);


// ============================================================
// PIECES LISTENER
// ============================================================

let previousPieces =
  null;

onValue(
  piecesRef,
  async snapshot => {

    const data =
      snapshot.val();

    if (!data) {
      return;
    }

    /*
     * Pertama kali:
     * langsung tampilkan.
     */

    if (!previousPieces) {

      pieces =
        data;

      renderPieces(
        data
      );

      previousPieces =
        JSON.parse(
          JSON.stringify(data)
        );

      return;

    }

    /*
     * Pergerakan selanjutnya
     */

    pieces =
      data;

    await syncPieceMovement(
      previousPieces,
      data
    );

    previousPieces =
      JSON.parse(
        JSON.stringify(data)
      );

    updateSelectablePieces();

  }
);


// ============================================================
// TURN DISPLAY
// ============================================================

function updateTurn() {

  if (!currentGame) {
    return;
  }

  const turn =
    currentGame.turn ||
    "red";

  if (
    turn === myColor
  ) {

    statusEl.textContent =
      `Giliran kamu • ${turn.toUpperCase()}`;

    statusEl.style.color =
      "#ff8cdd";

  } else {

    statusEl.textContent =
      `Giliran ${turn.toUpperCase()}`;

    statusEl.style.color =
      "#aaa";

  }

  if (
    currentGame.dice
  ) {

    setMessage(
      `${turn.toUpperCase()} mendapat ${currentGame.dice}. Pilih pion.`
    );

  } else {

    setMessage(
      `Giliran ${turn.toUpperCase()} — lempar dadu.`
    );

  }

}


// ============================================================
// MESSAGE
// ============================================================

function setMessage(
  text
) {

  if (messageEl) {
    messageEl.textContent =
      text;
  }

}


// ============================================================
// CREATE ROOM INITIAL STATE
// ============================================================

async function start() {

  try {

    setMessage(
      "Menghubungkan ke room..."
    );

    await initializeGame();

    await joinRoom();

    setMessage(
      "Room siap dimainkan."
    );

    console.log(
      "[SAVARI LUDO] Connected",
      ROOM_ID
    );

  } catch (error) {

    console.error(
      "[SAVARI LUDO ERROR]",
      error
    );

    statusEl.textContent =
      "Connection error";

    setMessage(
      "Gagal menghubungkan ke Firebase."
    );

  }

}


// ============================================================
// START
// ============================================================

start();
