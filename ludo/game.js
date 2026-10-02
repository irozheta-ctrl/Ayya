// ============================================================
// SAVARI LUDO
// Firebase Realtime Database
// Cocok dengan index.html versi papan 15 x 15
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
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
  params.get("room") || "TEST123";


// ============================================================
// FIREBASE REFERENCES
// ============================================================

const playersRef =
  ref(db, `rooms/${ROOM_ID}/players`);

const gameRef =
  ref(db, `rooms/${ROOM_ID}/game`);

const piecesRef =
  ref(db, `rooms/${ROOM_ID}/pieces`);


// ============================================================
// HTML ELEMENTS
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

if (roomIdEl) {
  roomIdEl.textContent = ROOM_ID;
}


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
      .slice(2, 9) +
    "_" +
    Date.now();

  localStorage.setItem(
    "savari_ludo_player_id",
    playerId
  );
}


// ============================================================
// WARNA
// ============================================================

const COLORS = [
  "red",
  "blue",
  "green",
  "yellow"
];


// ============================================================
// JALUR PAPAN
//
// Ini adalah loop yang benar-benar bersebelahan
// pada papan 15 x 15 yang kita buat.
//
// Setiap angka posisi = SATU KOTAK.
//
// 0 -> 1 -> 2 -> 3 ...
//
// Tidak ada perpindahan diagonal.
// Tidak ada loncat kotak.
// ============================================================

const PATH = [

  // ==========================
  // RED AREA → ATAS
  // ==========================

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
  [1,8],
  [1,9],
  [1,10],

  // ==========================
  // ATAS → KANAN
  // ==========================

  [2,10],
  [3,10],
  [4,10],
  [5,10],
  [6,10],

  [6,11],
  [6,12],
  [6,13],
  [6,14],
  [6,15],

  [7,15],
  [8,15],
  [9,15],
  [10,15],

  // ==========================
  // KANAN → BAWAH
  // ==========================

  [10,14],
  [10,13],
  [10,12],
  [10,11],
  [10,10],

  [11,10],
  [12,10],
  [13,10],
  [14,10],
  [15,10],

  [15,9],
  [15,8],
  [15,7],
  [15,6],

  // ==========================
  // BAWAH → KIRI
  // ==========================

  [14,6],
  [13,6],
  [12,6],
  [11,6],
  [10,6],

  [10,5],
  [10,4],
  [10,3],
  [10,2],
  [10,1],

  [9,1],
  [8,1]
];


// ============================================================
// CEK PATH
// ============================================================

console.log(
  "[SAVARI LUDO] Jumlah kotak:",
  PATH.length
);


// ============================================================
// START POSITION
//
// 4 warna berjarak sama pada loop.
// ============================================================

const START = {
  red: 0,
  blue: 14,
  green: 28,
  yellow: 42
};


// ============================================================
// STATE
// ============================================================

let myColor = null;

let players = {};

let pieces = {};

let pieceElements = {};

let game = {
  turn: "red",
  dice: 0,
  winner: null
};

let previousPieces = null;

let animating = false;

let rolling = false;


// ============================================================
// DICE
// ============================================================

const DICE = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅"
};


// ============================================================
// HELPER
// ============================================================

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}


function setMessage(text) {

  if (messageEl) {
    messageEl.textContent = text;
  }

}


// ============================================================
// GRID → PIXEL
//
// Ini adalah sistem koordinat yang sama dengan index.html.
//
// Jadi pion selalu berada tepat di tengah kotak.
// ============================================================

function gridToPercent(row, col) {

  return {
    left:
      ((col - 0.5) / 15) * 100,

    top:
      ((row - 0.5) / 15) * 100
  };

}


// ============================================================
// HOME SLOT → KOORDINAT BOARD
//
// INI BAGIAN PENTING.
//
// Kita TIDAK menebak posisi HOME.
//
// Kita mengambil posisi asli dari:
// #red-home-0
// #red-home-1
// dst.
//
// Jadi pion akan tepat di atas lingkaran HOME.
// ============================================================

function getHomePosition(color, index) {

  const slot =
    document.getElementById(
      `${color}-home-${index}`
    );

  if (!slot || !board) {

    return {
      left: 0,
      top: 0
    };

  }

  const boardRect =
    board.getBoundingClientRect();

  const slotRect =
    slot.getBoundingClientRect();

  const x =
    slotRect.left +
    slotRect.width / 2 -
    boardRect.left;

  const y =
    slotRect.top +
    slotRect.height / 2 -
    boardRect.top;

  return {

    left:
      (x / boardRect.width) * 100,

    top:
      (y / boardRect.height) * 100

  };

}


// ============================================================
// CREATE PIECE
// ============================================================

function createPiece(
  pieceId,
  color,
  index
) {

  if (pieceElements[pieceId]) {
    return pieceElements[pieceId];
  }

  const el =
    document.createElement("div");

  el.className =
    `piece ${color}`;

  el.dataset.pieceId =
    pieceId;

  el.dataset.color =
    color;

  el.dataset.index =
    index;

  el.addEventListener(
    "click",
    () => {

      selectPiece(
        pieceId
      );

    }
  );

  piecesLayer.appendChild(el);

  pieceElements[pieceId] =
    el;

  return el;

}


// ============================================================
// GET POSITION
//
// position -1 = HOME
// position 0..55 = jalur
// position 56 = FINISH
// ============================================================

function getPosition(
  color,
  index,
  position
) {

  /*
   * HOME
   */

  if (
    position === undefined ||
    position < 0
  ) {

    return getHomePosition(
      color,
      index
    );

  }

  /*
   * FINISH
   */

  if (
    position >= PATH.length
  ) {

    return gridToPercent(
      8,
      8
    );

  }

  /*
   * JALUR
   */

  const start =
    START[color];

  const pathIndex =
    (start + position) %
    PATH.length;

  const [row, col] =
    PATH[pathIndex];

  return gridToPercent(
    row,
    col
  );

}


// ============================================================
// MOVE ELEMENT TO POSITION
// ============================================================

function moveElement(
  pieceId,
  color,
  index,
  position,
  animate = true
) {

  const el =
    pieceElements[pieceId] ||
    createPiece(
      pieceId,
      color,
      index
    );

  const pos =
    getPosition(
      color,
      index,
      position
    );

  if (animate) {

    el.style.transition =
      "left .18s linear, top .18s linear, transform .12s ease";

  } else {

    el.style.transition =
      "none";

  }

  el.style.left =
    `${pos.left}%`;

  el.style.top =
    `${pos.top}%`;

}


// ============================================================
// INITIALIZE 16 PION
// ============================================================

function createAllPieces() {

  COLORS.forEach(
    color => {

      for (
        let index = 0;
        index < 4;
        index++
      ) {

        const id =
          `${color}_${index}`;

        createPiece(
          id,
          color,
          index
        );

        /*
         * LANGSUNG TAMPIL DI HOME.
         */

        moveElement(
          id,
          color,
          index,
          -1,
          false
        );

      }

    }
  );

}


// ============================================================
// INITIALIZE FIREBASE PIECES
// ============================================================

async function initializePieces() {

  await runTransaction(
    piecesRef,
    current => {

      /*
       * Kalau sudah ada,
       * jangan hapus posisi pemain.
       */

      if (
        current &&
        Object.keys(current).length >= 16
      ) {

        return current;

      }

      const result =
        current || {};

      COLORS.forEach(
        color => {

          for (
            let index = 0;
            index < 4;
            index++
          ) {

            const id =
              `${color}_${index}`;

            if (!result[id]) {

              result[id] = {

                id,

                color,

                index,

                position:
                  -1

              };

            }

          }

        }
      );

      return result;

    }
  );

}


// ============================================================
// RENDER INITIAL PIECES
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
    data
  ).forEach(
    ([id, piece]) => {

      if (!piece) {
        return;
      }

      moveElement(
        id,
        piece.color,
        Number(piece.index),
        Number(
          piece.position ?? -1
        ),
        false
      );

    }
  );

  updateSelectable();

}


// ============================================================
// ANIMATE PIECE
// ============================================================

async function animatePiece(
  id,
  color,
  index,
  from,
  to
) {

  /*
   * HOME → START
   */

  if (from < 0) {

    moveElement(
      id,
      color,
      index,
      to,
      true
    );

    await sleep(220);

    return;
  }

  /*
   * Gerak satu kotak demi satu kotak.
   */

  const direction =
    to > from ? 1 : -1;

  let current =
    from;

  while (
    current !== to
  ) {

    current +=
      direction;

    moveElement(
      id,
      color,
      index,
      current,
      true
    );

    await sleep(190);

  }

}


// ============================================================
// SYNC DARI FIREBASE
// ============================================================

async function syncPieces(
  newPieces
) {

  if (!previousPieces) {

    renderPieces(
      newPieces
    );

    previousPieces =
      JSON.parse(
        JSON.stringify(newPieces)
      );

    return;

  }

  for (
    const [id, newPiece]
    of Object.entries(
      newPieces
    )
  ) {

    if (!newPiece) {
      continue;
    }

    const oldPiece =
      previousPieces[id];

    const oldPosition =
      Number(
        oldPiece?.position ?? -1
      );

    const newPosition =
      Number(
        newPiece.position ?? -1
      );

    if (
      oldPosition ===
      newPosition
    ) {

      continue;

    }

    await animatePiece(
      id,
      newPiece.color,
      Number(newPiece.index),
      oldPosition,
      newPosition
    );

  }

  pieces =
    newPieces;

  previousPieces =
    JSON.parse(
      JSON.stringify(newPieces)
    );

  updateSelectable();

}


// ============================================================
// SELECTABLE PIECES
// ============================================================

function updateSelectable() {

  Object.values(
    pieceElements
  ).forEach(
    el => {

      el.classList.remove(
        "selectable"
      );

    }
  );

  if (!myColor) {
    return;
  }

  if (
    game.turn !==
    myColor
  ) {
    return;
  }

  if (
    !game.dice ||
    game.dice <= 0
  ) {
    return;
  }

  Object.entries(
    pieces
  ).forEach(
    ([id, piece]) => {

      if (
        piece.color !==
        myColor
      ) {
        return;
      }

      const position =
        Number(
          piece.position ?? -1
        );

      /*
       * Finish
       */

      if (
        position >= PATH.length
      ) {
        return;
      }

      /*
       * HOME hanya keluar
       * kalau dadu 6.
       */

      if (
        position < 0 &&
        game.dice !== 6
      ) {
        return;
      }

      const el =
        pieceElements[id];

      if (el) {

        el.classList.add(
          "selectable"
        );

      }

    }
  );

}


// ============================================================
// CLICK PION
// ============================================================

async function selectPiece(
  pieceId
) {

  if (animating) {
    return;
  }

  if (!myColor) {
    return;
  }

  if (
    game.turn !==
    myColor
  ) {

    setMessage(
      `Sekarang giliran ${game.turn.toUpperCase()}.`
    );

    return;

  }

  const dice =
    Number(game.dice || 0);

  if (!dice) {

    setMessage(
      "Lempar dadu terlebih dahulu."
    );

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

  const current =
    Number(
      piece.position ?? -1
    );

  /*
   * HOME
   */

  if (current < 0) {

    if (dice !== 6) {

      setMessage(
        "Pion hanya bisa keluar jika mendapat angka 6."
      );

      return;

    }

    await movePieceFirebase(
      pieceId,
      0
    );

    return;

  }

  /*
   * FINISH
   */

  if (
    current >= PATH.length
  ) {
    return;
  }

  const target =
    current + dice;

  /*
   * Jangan melewati finish.
   */

  if (
    target > PATH.length
  ) {

    setMessage(
      "Jumlah langkah melewati garis finish."
    );

    return;

  }

  await movePieceFirebase(
    pieceId,
    target
  );

}


// ============================================================
// MOVE TO FIREBASE
// ============================================================

async function movePieceFirebase(
  pieceId,
  target
) {

  animating = true;

  try {

    await update(
      ref(
        db,
        `rooms/${ROOM_ID}/pieces/${pieceId}`
      ),
      {
        position:
          target
      }
    );

    /*
     * Firebase listener akan
     * menjalankan animasinya.
     */

    await sleep(
      Math.max(
        300,
        Number(game.dice || 1) * 200
      )
    );

    /*
     * 6 = giliran lagi.
     */

    const extra =
      Number(game.dice) === 6;

    const next =
      extra
        ? myColor
        : nextColor(myColor);

    await update(
      gameRef,
      {
        turn:
          next,

        dice:
          0
      }
    );

  } catch (error) {

    console.error(
      "[LUDO MOVE ERROR]",
      error
    );

    setMessage(
      "Gagal memindahkan pion."
    );

  }

  animating = false;

}


// ============================================================
// NEXT COLOR
// ============================================================

function nextColor(
  color
) {

  const index =
    COLORS.indexOf(color);

  return COLORS[
    (index + 1) %
    COLORS.length
  ];

}


// ============================================================
// JOIN PLAYER
// ============================================================

async function joinRoom() {

  await runTransaction(
    playersRef,
    current => {

      const data =
        current || {};

      /*
       * Player sudah ada.
       */

      if (
        data[playerId]
      ) {

        return data;

      }

      /*
       * Warna yang sudah dipakai.
       */

      const used =
        Object.values(
          data
        ).map(
          player =>
            player.color
        );

      /*
       * Cari warna kosong.
       */

      const color =
        COLORS.find(
          c =>
            !used.includes(c)
        );

      /*
       * Room penuh.
       */

      if (!color) {
        return data;
      }

      data[playerId] = {

        id:
          playerId,

        name:
          "Player-" +
          playerId
            .slice(-4)
            .toUpperCase(),

        color,

        joinedAt:
          Date.now()

      };

      return data;

    }
  );

}


// ============================================================
// PLAYER LISTENER
// ============================================================

onValue(
  playersRef,
  snapshot => {

    players =
      snapshot.val() || {};

    renderPlayers();

    const me =
      players[playerId];

    if (me) {

      myColor =
        me.color;

      if (statusEl) {

        statusEl.textContent =
          `Kamu: ${myColor.toUpperCase()}`;

      }

    }

    updateSelectable();

  }
);


// ============================================================
// RENDER PLAYERS
// ============================================================

function renderPlayers() {

  if (!playersEl) {
    return;
  }

  playersEl.innerHTML =
    "";

  const list =
    Object.values(players);

  if (!list.length) {

    playersEl.innerHTML =
      `<div class="player">Menunggu pemain...</div>`;

    return;

  }

  list.forEach(
    player => {

      const el =
        document.createElement("div");

      el.className =
        "player";

      el.textContent =
        `${emoji(player.color)} ${player.name}`;

      playersEl.appendChild(
        el
      );

    }
  );

}


function emoji(color) {

  if (color === "red")
    return "🔴";

  if (color === "blue")
    return "🔵";

  if (color === "green")
    return "🟢";

  if (color === "yellow")
    return "🟡";

  return "⚪";

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

    game =
      data;

    const dice =
      Number(
        data.dice || 0
      );

    if (dice > 0) {

      diceEl.textContent =
        DICE[dice];

    } else {

      diceEl.textContent =
        "🎲";

    }

    updateTurn();

    updateSelectable();

  }
);


// ============================================================
// PIECES LISTENER
// ============================================================

onValue(
  piecesRef,
  async snapshot => {

    const data =
      snapshot.val();

    if (!data) {
      return;
    }

    await syncPieces(
      data
    );

  }
);


// ============================================================
// TURN DISPLAY
// ============================================================

function updateTurn() {

  const turn =
    game.turn ||
    "red";

  if (
    statusEl
  ) {

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

  }

  if (
    game.dice
  ) {

    setMessage(
      `${turn.toUpperCase()} mendapat ${game.dice}. Pilih pion.`
    );

  } else {

    setMessage(
      `Giliran ${turn.toUpperCase()} — lempar dadu.`
    );

  }

}


// ============================================================
// ROLL DICE
// ============================================================

if (rollBtn) {

  rollBtn.addEventListener(
    "click",
    async () => {

      if (rolling) {
        return;
      }

      if (!myColor) {

        setMessage(
          "Kamu belum mendapat warna."
        );

        return;

      }

      if (
        game.turn !==
        myColor
      ) {

        setMessage(
          `Sekarang giliran ${game.turn.toUpperCase()}.`
        );

        return;

      }

      if (
        Number(game.dice || 0) > 0
      ) {

        setMessage(
          "Pilih pion terlebih dahulu."
        );

        return;

      }

      rolling = true;

      rollBtn.disabled =
        true;

      /*
       * Animasi dadu.
       */

      for (
        let i = 0;
        i < 9;
        i++
      ) {

        const n =
          Math.floor(
            Math.random() * 6
          ) + 1;

        diceEl.textContent =
          DICE[n];

        await sleep(65);

      }

      /*
       * Hasil final.
       */

      const result =
        Math.floor(
          Math.random() * 6
        ) + 1;

      diceEl.textContent =
        DICE[result];

      /*
       * Simpan ke Firebase.
       */

      await update(
        gameRef,
        {
          dice:
            result
        }
      );

      rolling =
        false;

      rollBtn.disabled =
        false;

    }
  );

}


// ============================================================
// INITIALIZE GAME
// ============================================================

async function initializeGame() {

  /*
   * Pastikan game state ada.
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

        winner:
          null

      };

    }
  );

  /*
   * Pastikan 16 pion ada.
   */

  await initializePieces();

}


// ============================================================
// START
// ============================================================

async function start() {

  try {

    /*
     * Buat 16 elemen pion
     * LANGSUNG di HOME.
     */

    createAllPieces();

    /*
     * Firebase.
     */

    await initializeGame();

    await joinRoom();

    if (statusEl) {

      statusEl.textContent =
        "Connected";

    }

    setMessage(
      "Room siap dimainkan."
    );

    console.log(
      "[SAVARI LUDO] READY",
      ROOM_ID
    );

  } catch (error) {

    console.error(
      "[SAVARI LUDO]",
      error
    );

    if (statusEl) {

      statusEl.textContent =
        "Connection error";

    }

    setMessage(
      "Gagal menghubungkan ke Firebase."
    );

  }

}


// ============================================================
// START
// ============================================================

start();
