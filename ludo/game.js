import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  runTransaction
} from
"https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";


/* =====================================================
   FIREBASE
===================================================== */

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


/* =====================================================
   ROOM
===================================================== */

const params = new URLSearchParams(location.search);
const roomId = params.get("room");

const roomText = document.getElementById("roomId");
const board = document.getElementById("board");
const diceEl = document.getElementById("dice");
const rollButton = document.getElementById("rollButton");
const turnPlayer = document.getElementById("turnPlayer");
const statusEl = document.getElementById("status");

if (!roomId) {
  statusEl.textContent = "❌ Room tidak ditemukan.";
  throw new Error("Room ID tidak ditemukan");
}

roomText.textContent = roomId;


/* =====================================================
   PLAYER ID
===================================================== */

let playerId =
  localStorage.getItem("savari_ludo_player_id");

if (!playerId) {

  playerId =
    "p_" +
    Math.random()
      .toString(36)
      .slice(2, 10);

  localStorage.setItem(
    "savari_ludo_player_id",
    playerId
  );
}


/* =====================================================
   FIREBASE REFERENCES
===================================================== */

const playersRef =
  ref(db, `rooms/${roomId}/players`);

const myPlayerRef =
  ref(
    db,
    `rooms/${roomId}/players/${playerId}`
  );

const gameRef =
  ref(db, `rooms/${roomId}/game`);

const piecesRef =
  ref(db, `rooms/${roomId}/pieces`);


/* =====================================================
   COLORS
===================================================== */

const COLORS = [
  "red",
  "blue",
  "green",
  "yellow"
];

const COLOR_HEX = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308"
};


/* =====================================================
   52 PETAK LINTASAN
===================================================== */

const PATH = [

  [7,1],
  [8,1],
  [9,1],

  [9,2],
  [9,3],
  [9,4],
  [9,5],
  [9,6],

  [10,7],
  [11,7],
  [12,7],
  [13,7],
  [14,7],
  [15,7],

  [15,8],
  [15,9],

  [14,9],
  [13,9],
  [12,9],
  [11,9],
  [10,9],

  [9,10],
  [9,11],
  [9,12],
  [9,13],
  [9,14],
  [9,15],

  [8,15],
  [7,15],

  [7,14],
  [7,13],
  [7,12],
  [7,11],
  [7,10],

  [6,9],
  [5,9],
  [4,9],
  [3,9],
  [2,9],
  [1,9],

  [1,8],
  [1,7],

  [2,7],
  [3,7],
  [4,7],
  [5,7],
  [6,7],

  [7,6],
  [7,5],
  [7,4],
  [7,3],
  [7,2]
];


/* =====================================================
   START POSITION MASING-MASING WARNA
===================================================== */

const START = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39
};


/* =====================================================
   POSISI RUMAH
===================================================== */

const HOME = {

  red: [
    [3,3],
    [5,3],
    [3,5],
    [5,5]
  ],

  blue: [
    [11,3],
    [13,3],
    [11,5],
    [13,5]
  ],

  green: [
    [3,11],
    [5,11],
    [3,13],
    [5,13]
  ],

  yellow: [
    [11,11],
    [13,11],
    [11,13],
    [13,13]
  ]
};


/* =====================================================
   STATE LOKAL
===================================================== */

let players = [];

let myColor = null;

let game = {
  turnIndex: 0,
  dice: 1,
  pending: false,
  moveId: 0
};

let pieces = {
  red: [-1,-1,-1,-1],
  blue: [-1,-1,-1,-1],
  green: [-1,-1,-1,-1],
  yellow: [-1,-1,-1,-1]
};


/*
   Ini hanya untuk posisi yang sedang
   ditampilkan di layar.

   Firebase tetap menjadi sumber utama.
*/

const visualPosition = {
  red: [-1,-1,-1,-1],
  blue: [-1,-1,-1,-1],
  green: [-1,-1,-1,-1],
  yellow: [-1,-1,-1,-1]
};


/* =====================================================
   ELEMENT PION
===================================================== */

const pieceElements = {};


/* =====================================================
   UTIL
===================================================== */

function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );

}


/* =====================================================
   KONVERSI KOORDINAT
===================================================== */

function percentPosition(
  x,
  y
) {

  return {
    left:
      `${((x - 0.5) / 15) * 100}%`,

    top:
      `${((y - 0.5) / 15) * 100}%`
  };

}


/* =====================================================
   DAPATKAN KOORDINAT PION
===================================================== */

function getPieceCoordinate(
  color,
  index,
  progress
) {

  if (progress < 0) {

    return HOME[color][index];

  }

  const trackIndex =
    (
      START[color] +
      progress
    ) % PATH.length;

  return PATH[trackIndex];

}


/* =====================================================
   BUAT PION
===================================================== */

function createPiece(
  color,
  index
) {

  const key =
    `${color}_${index}`;

  if (pieceElements[key])
    return pieceElements[key];

  const piece =
    document.createElement("div");

  piece.className =
    `piece ${color} savari-piece`;

  piece.dataset.color =
    color;

  piece.dataset.index =
    index;

  piece.style.zIndex = "50";

  piece.addEventListener(
    "click",
    () => {

      requestMove(
        color,
        index
      );

    }
  );

  board.appendChild(piece);

  pieceElements[key] =
    piece;

  return piece;
}


/* =====================================================
   SET POSISI VISUAL
===================================================== */

function setVisualPosition(
  color,
  index,
  progress
) {

  const piece =
    createPiece(
      color,
      index
    );

  const [x,y] =
    getPieceCoordinate(
      color,
      index,
      progress
    );

  const pos =
    percentPosition(
      x,
      y
    );

  piece.style.left =
    pos.left;

  piece.style.top =
    pos.top;

}


/* =====================================================
   RENDER AWAL
===================================================== */

function renderAllPieces() {

  COLORS.forEach(
    color => {

      for (
        let i = 0;
        i < 4;
        i++
      ) {

        createPiece(
          color,
          i
        );

        setVisualPosition(
          color,
          i,
          visualPosition[color][i]
        );

      }

    }
  );

  highlightMovable();
}


/* =====================================================
   ANIMASI DARI POSISI LAMA KE BARU
===================================================== */

async function animatePiece(
  color,
  index,
  from,
  to
) {

  /*
     Kalau pion baru muncul dari rumah.
  */

  if (from < 0) {

    setVisualPosition(
      color,
      index,
      -1
    );

    await sleep(150);

    from = 0;

    setVisualPosition(
      color,
      index,
      0
    );

    await sleep(180);

  }


  /*
     Tidak ada perubahan.
  */

  if (from === to) {

    setVisualPosition(
      color,
      index,
      to
    );

    return;
  }


  /*
     Gerakkan satu petak
     setiap langkah.
  */

  const direction =
    to > from ? 1 : -1;

  let current = from;

  while (
    current !== to
  ) {

    current += direction;

    setVisualPosition(
      color,
      index,
      current
    );

    await sleep(170);

  }

}


/* =====================================================
   SINKRONISASI POSISI DARI FIREBASE
===================================================== */

let animationQueue =
  Promise.resolve();


function syncPieces(
  firebasePieces
) {

  COLORS.forEach(
    color => {

      for (
        let index = 0;
        index < 4;
        index++
      ) {

        const target =
          Number(
            firebasePieces?.[color]?.[index] ??
            -1
          );

        const current =
          visualPosition[color][index];


        /*
           Posisi Firebase menjadi target resmi.
        */

        pieces[color][index] =
          target;


        /*
           Jika sama, tidak perlu animasi.
        */

        if (
          current === target
        ) {
          continue;
        }


        /*
           Semua animasi masuk satu antrean.
           Ini mencegah beberapa gerakan
           bertabrakan.
        */

        animationQueue =
          animationQueue.then(
            async () => {

              await animatePiece(
                color,
                index,
                current,
                target
              );

              visualPosition[color][index] =
                target;

            }
          );

      }

    }
  );

}


/* =====================================================
   HIGHLIGHT PION YANG BISA DIPILIH
===================================================== */

function highlightMovable() {

  Object.values(
    pieceElements
  ).forEach(
    piece => {

      piece.classList.remove(
        "selectable"
      );

    }
  );


  if (!game.pending)
    return;

  if (!myColor)
    return;


  COLORS.forEach(
    color => {

      if (
        color !== myColor
      )
        return;


      for (
        let i = 0;
        i < 4;
        i++
      ) {

        const key =
          `${color}_${i}`;

        const piece =
          pieceElements[key];

        if (piece) {

          piece.classList.add(
            "selectable"
          );

        }

      }

    }
  );

}


/* =====================================================
   JOIN PLAYER DENGAN TRANSACTION
===================================================== */

async function joinRoom() {

  const result =
    await runTransaction(
      playersRef,
      current => {

        const data =
          current || {};

        if (data[playerId]) {

          return data;

        }


        const existing =
          Object.values(data);


        if (existing.length >= 4) {

          return;

        }


        const usedColors =
          existing.map(
            player =>
              player.color
          );


        const freeColor =
          COLORS.find(
            color =>
              !usedColors.includes(color)
          );


        if (!freeColor)
          return;


        const playerNumber =
          COLORS.indexOf(
            freeColor
          ) + 1;


        data[playerId] = {

          id: playerId,

          name:
            `Player ${playerNumber}`,

          color:
            freeColor,

          joinedAt:
            Date.now()

        };


        return data;

      }
    );


  if (!result.committed) {

    statusEl.textContent =
      "❌ Room penuh atau gagal masuk.";

    rollButton.disabled =
      true;

    return;

  }


  const me =
    result.snapshot.val()?.[playerId];


  if (me) {

    myColor =
      me.color;

  }


  await onDisconnect(
    myPlayerRef
  ).remove();

}


/* =====================================================
   INITIAL GAME
===================================================== */

async function initializeGame() {

  await runTransaction(
    gameRef,
    current => {

      if (current)
        return current;

      return {

        turnIndex: 0,

        dice: 1,

        pending: false,

        moveId: 0

      };

    }
  );


  await runTransaction(
    piecesRef,
    current => {

      if (current)
        return current;

      return {

        red: [-1,-1,-1,-1],

        blue: [-1,-1,-1,-1],

        green: [-1,-1,-1,-1],

        yellow: [-1,-1,-1,-1]

      };

    }
  );

}


/* =====================================================
   PLAYERS SYNC
===================================================== */

onValue(
  playersRef,
  snapshot => {

    const data =
      snapshot.val() || {};

    players =
      Object.values(data)
      .sort(
        (a,b) =>
          (a.joinedAt || 0) -
          (b.joinedAt || 0)
      );


    const me =
      data[playerId];


    if (me) {

      myColor =
        me.color;

    }


    renderPlayers();

    updateTurn();

  }
);


/* =====================================================
   GAME SYNC
===================================================== */

onValue(
  gameRef,
  snapshot => {

    const data =
      snapshot.val();

    if (!data)
      return;


    game = {

      turnIndex:
        Number(
          data.turnIndex ?? 0
        ),

      dice:
        Number(
          data.dice ?? 1
        ),

      pending:
        Boolean(
          data.pending
        ),

      moveId:
        Number(
          data.moveId ?? 0
        )

    };


    diceEl.textContent =
      game.dice;


    updateTurn();

    highlightMovable();

  }
);


/* =====================================================
   PIECES SYNC
===================================================== */

onValue(
  piecesRef,
  snapshot => {

    const data =
      snapshot.val();

    if (!data)
      return;


    syncPieces(data);

  }
);


/* =====================================================
   RENDER PLAYER
===================================================== */

function renderPlayers() {

  for (
    let i = 0;
    i < 4;
    i++
  ) {

    const name =
      document.getElementById(
        `playerName${i}`
      );

    const card =
      document.getElementById(
        `playerCard${i}`
      );


    const player =
      players[i];


    if (!player) {

      if (name)
        name.textContent =
          "Menunggu";

      if (card)
        card.classList.remove(
          "active"
        );

      continue;

    }


    if (name) {

      name.textContent =
        player.name +
        (
          player.id === playerId
            ? " (KAMU)"
            : ""
        );

    }


    if (card) {

      card.style.borderColor =
        COLOR_HEX[
          player.color
        ];

      card.classList.toggle(
        "active",
        player.id === playerId
      );

    }

  }

}


/* =====================================================
   UPDATE TURN
===================================================== */

function updateTurn() {

  if (!players.length) {

    turnPlayer.textContent =
      "Menunggu pemain";

    rollButton.disabled =
      true;

    return;

  }


  const current =
    players[
      Number(game.turnIndex || 0)
      % players.length
    ];


  if (!current)
    return;


  turnPlayer.textContent =
    current.name;


  const isMine =
    current.id === playerId;


  rollButton.disabled =
    !isMine ||
    game.pending;


  if (isMine) {

    statusEl.textContent =
      game.pending
        ? "🎯 Pilih pion."
        : "🎲 Giliran kamu — lempar dadu.";

  } else {

    statusEl.textContent =
      `⏳ Menunggu ${current.name}`;

  }


  highlightMovable();

}


/* =====================================================
   LEMPAR DADU
===================================================== */

rollButton.addEventListener(
  "click",
  async () => {

    if (rollButton.disabled)
      return;

    if (game.pending)
      return;


    const current =
      players[
        Number(game.turnIndex || 0)
        % players.length
      ];


    if (
      !current ||
      current.id !== playerId
    )
      return;


    const value =
      Math.floor(
        Math.random() * 6
      ) + 1;


    /*
       Animasi dadu lokal.
    */

    let count = 0;

    const timer =
      setInterval(
        () => {

          diceEl.textContent =
            Math.floor(
              Math.random() * 6
            ) + 1;

          count++;

          if (count >= 8) {

            clearInterval(timer);

            diceEl.textContent =
              value;

          }

        },
        80
      );


    await sleep(700);


    /*
       Firebase menjadi sumber
       dadu resmi.
    */

    await update(
      gameRef,
      {

        dice: value,

        pending: true,

        moveId:
          Number(game.moveId || 0) + 1

      }
    );

  }
);


/* =====================================================
   REQUEST GERAK PION
===================================================== */

async function requestMove(
  color,
  index
) {

  if (!game.pending)
    return;

  if (color !== myColor)
    return;


  const current =
    players[
      Number(game.turnIndex || 0)
      % players.length
    ];


  if (
    !current ||
    current.id !== playerId
  )
    return;


  const dice =
    Number(game.dice);


  const oldPosition =
    Number(
      pieces[color][index]
    );


  /*
     Pion rumah harus 6.
  */

  if (
    oldPosition < 0 &&
    dice !== 6
  ) {

    statusEl.textContent =
      "❌ Pion di rumah harus mendapat 6.";

    return;

  }


  let newPosition;


  if (oldPosition < 0) {

    newPosition = 0;

  } else {

    newPosition =
      oldPosition + dice;

  }


  /*
     Belum boleh keluar dari
     lintasan pada versi dasar.
  */

  if (
    newPosition >= PATH.length
  ) {

    newPosition =
      PATH.length - 1;

  }


  /*
     Update dilakukan langsung
     ke Firebase.

     HP ini TIDAK mengubah
     posisi visual secara manual.

     Listener Firebase yang akan
     menggerakkan pion.
  */

  const updated =
    {
      red: [...pieces.red],

      blue: [...pieces.blue],

      green: [...pieces.green],

      yellow: [...pieces.yellow]
    };


  updated[color][index] =
    newPosition;


  /*
     Simpan posisi resmi.
  */

  await set(
    piecesRef,
    updated
  );


  /*
     Setelah posisi tersimpan,
     pindahkan giliran.
  */

  let nextTurn =
    Number(
      game.turnIndex || 0
    );


  /*
     Dapat 6 = tetap giliran.
  */

  if (dice !== 6) {

    nextTurn =
      (
        nextTurn + 1
      ) % players.length;

  }


  await update(
    gameRef,
    {

      dice: 1,

      pending: false,

      turnIndex: nextTurn,

      moveId:
        Number(game.moveId || 0) + 1

    }
  );

}


/* =====================================================
   START
===================================================== */

(async function start() {

  try {

    renderAllPieces();

    statusEl.textContent =
      "🟡 Menyiapkan room...";


    await initializeGame();

    await joinRoom();


    statusEl.textContent =
      "🟢 Firebase terhubung — room siap.";

  } catch (error) {

    console.error(
      "SAVARI LUDO ERROR:",
      error
    );

    statusEl.textContent =
      "❌ Gagal menghubungkan room.";

    rollButton.disabled =
      true;

  }

})();
