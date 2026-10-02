import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    update,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";


/* =====================================================
   FIREBASE
===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyALjjBvSRi37TEVKbUTXRKRQ90e07kcNgA",
    authDomain: "savari-ludo.firebaseapp.com",
    databaseURL: "https://savari-ludo-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "savari-ludo",
    storageBucket: "savari-ludo.firebasestorage.app",
    messagingSenderId: "882276906132",
    appId: "1:882276906132:web:64f21c73ebce582a447081"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


/* =====================================================
   ELEMENT
===================================================== */

const params = new URLSearchParams(
    window.location.search
);

const roomId = params.get("room");

const roomText =
    document.getElementById("roomId");

const dice =
    document.getElementById("dice");

const rollButton =
    document.getElementById("rollButton");

const turnPlayer =
    document.getElementById("turnPlayer");

const status =
    document.getElementById("status");

const board =
    document.querySelector(".board");


if (!roomId) {

    roomText.textContent = "BELUM ADA";

    status.textContent =
        "❌ Room ID belum tersedia.";

    status.className =
        "status error";

    throw new Error(
        "Room ID tidak ditemukan."
    );
}

roomText.textContent = roomId;


/* =====================================================
   PLAYER ID
===================================================== */

let playerId =
    localStorage.getItem(
        "savariLudoPlayerId"
    );

if (!playerId) {

    playerId =
        "player_" +
        Math.random()
            .toString(36)
            .substring(2, 10);

    localStorage.setItem(
        "savariLudoPlayerId",
        playerId
    );
}


/* =====================================================
   WARNA
===================================================== */

const colors = [
    "red",
    "blue",
    "green",
    "yellow"
];

const colorHex = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308"
};


/* =====================================================
   FIREBASE REFERENCE
===================================================== */

const roomRef =
    ref(db, `rooms/${roomId}`);

const playersRef =
    ref(db, `rooms/${roomId}/players`);

const gameRef =
    ref(db, `rooms/${roomId}/game`);

const playerRef =
    ref(
        db,
        `rooms/${roomId}/players/${playerId}`
    );


let myColor = null;


/* =====================================================
   DATA PION
===================================================== */

/*
   position -1 = masih di rumah

   0 - 51 = jalur utama

   52 - 57 = jalur akhir
*/

const PIECES_PER_PLAYER = 4;

const pieceState = {};

colors.forEach(color => {

    pieceState[color] = [];

    for (
        let i = 0;
        i < PIECES_PER_PLAYER;
        i++
    ) {

        pieceState[color].push(-1);
    }
});


/* =====================================================
   POSISI JALUR
===================================================== */

/*
   Koordinat memakai sistem grid 15 x 15.

   Ini adalah jalur dasar visual.
*/

const path = [

    [6, 1],
    [7, 1],
    [8, 1],
    [9, 1],
    [9, 2],
    [9, 3],
    [9, 4],
    [9, 5],
    [9, 6],

    [10, 6],
    [11, 6],
    [12, 6],
    [13, 6],
    [14, 6],
    [14, 7],
    [14, 8],
    [13, 8],
    [12, 8],
    [11, 8],
    [10, 8],
    [9, 8],

    [9, 9],
    [9, 10],
    [9, 11],
    [9, 12],
    [9, 13],
    [9, 14],

    [8, 14],
    [7, 14],
    [6, 14],
    [6, 13],
    [6, 12],
    [6, 11],
    [6, 10],

    [5, 9],
    [4, 9],
    [3, 9],
    [2, 9],
    [1, 9],
    [1, 8],
    [1, 7],

    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],

    [6, 6],
    [6, 5],
    [6, 4],
    [6, 3],
    [6, 2]
];


/* =====================================================
   HOME POSITION
===================================================== */

const homePositions = {

    red: [
        [2, 2],
        [4, 2],
        [2, 4],
        [4, 4]
    ],

    blue: [
        [11, 2],
        [13, 2],
        [11, 4],
        [13, 4]
    ],

    green: [
        [2, 11],
        [4, 11],
        [2, 13],
        [4, 13]
    ],

    yellow: [
        [11, 11],
        [13, 11],
        [11, 13],
        [13, 13]
    ]
};


/* =====================================================
   BUAT LAYER PION
===================================================== */

const piecesLayer =
    document.createElement("div");

piecesLayer.id =
    "savariPiecesLayer";

piecesLayer.style.position =
    "absolute";

piecesLayer.style.inset =
    "0";

piecesLayer.style.pointerEvents =
    "none";

piecesLayer.style.zIndex =
    "20";

board.appendChild(
    piecesLayer
);


/* =====================================================
   STYLE LAYER
===================================================== */

const extraStyle =
    document.createElement("style");

extraStyle.textContent = `

#savariPiecesLayer {
    pointer-events: none;
}

.savari-piece {
    position: absolute;
    width: 5%;
    height: 5%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,.85);
    box-shadow:
        0 0 8px currentColor,
        0 0 18px currentColor;
    cursor: pointer;
    pointer-events: auto;
    transition:
        left .35s ease,
        top .35s ease,
        transform .2s ease;
    z-index: 30;
}

.savari-piece:hover {
    transform:
        translate(-50%, -50%)
        scale(1.18);
}

.savari-piece.selected {
    transform:
        translate(-50%, -50%)
        scale(1.25);
    box-shadow:
        0 0 10px #fff,
        0 0 25px currentColor,
        0 0 40px currentColor;
}

.savari-piece.red {
    background:#ef4444;
    color:#ef4444;
}

.savari-piece.blue {
    background:#3b82f6;
    color:#3b82f6;
}

.savari-piece.green {
    background:#22c55e;
    color:#22c55e;
}

.savari-piece.yellow {
    background:#eab308;
    color:#eab308;
}

.savari-piece-number {
    position:absolute;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:center;
    color:white;
    font-size:8px;
    font-weight:900;
    text-shadow:0 1px 3px #000;
}

@keyframes savariMove {

    0% {
        transform:
            translate(-50%, -50%)
            scale(.8);
    }

    50% {
        transform:
            translate(-50%, -50%)
            scale(1.3);
    }

    100% {
        transform:
            translate(-50%, -50%)
            scale(1);
    }
}

.savari-piece.moving {
    animation:
        savariMove .35s ease;
}

`;

document.head.appendChild(
    extraStyle
);


/* =====================================================
   ROOM
===================================================== */

onValue(
    roomRef,
    async snapshot => {

        const room =
            snapshot.val();

        if (!room) {

            await set(
                roomRef,
                {
                    createdAt:
                        Date.now(),

                    game: {
                        turnIndex: 0,
                        dice: 1,
                        started: false
                    }
                }
            );

            return;
        }

        if (!room.game) {

            await update(
                roomRef,
                {
                    game: {
                        turnIndex: 0,
                        dice: 1,
                        started: false
                    }
                }
            );
        }
    }
);


/* =====================================================
   PLAYER JOIN
===================================================== */

onValue(
    playersRef,
    async snapshot => {

        const players =
            snapshot.val() || {};

        const list =
            Object.values(players)
                .sort(
                    (a, b) =>
                        (a.joinedAt || 0) -
                        (b.joinedAt || 0)
                );

        if (
            !players[playerId] &&
            list.length >= 4
        ) {

            status.textContent =
                "❌ Room sudah penuh.";

            status.className =
                "status error";

            rollButton.disabled =
                true;

            return;
        }


        if (players[playerId]) {

            const index =
                list.findIndex(
                    p =>
                        p.id === playerId
                );

            myColor =
                players[playerId].color ||
                colors[index] ||
                "red";

        } else {

            const usedColors =
                list.map(
                    p => p.color
                );

            const freeColor =
                colors.find(
                    color =>
                        !usedColors.includes(
                            color
                        )
                ) || "red";

            myColor =
                freeColor;

            await set(
                playerRef,
                {
                    id: playerId,

                    name:
                        "Player " +
                        (list.length + 1),

                    color:
                        myColor,

                    joinedAt:
                        Date.now(),

                    connected:
                        true
                }
            );
        }

        renderPlayers(list);

        status.textContent =
            `🟢 ${list.length}/4 pemain terhubung`;

        status.className =
            "status";
    },

    error => {

        console.error(error);

        status.textContent =
            "❌ Firebase error.";

        status.className =
            "status error";
    }
);


/* =====================================================
   GAME STATE
===================================================== */

onValue(
    gameRef,
    snapshot => {

        const game =
            snapshot.val();

        if (!game) return;

        dice.textContent =
            game.dice || 1;

        const turnIndex =
            game.turnIndex || 0;

        onValue(
            playersRef,
            playerSnapshot => {

                const players =
                    Object.values(
                        playerSnapshot.val() || {}
                    ).sort(
                        (a, b) =>
                            (a.joinedAt || 0) -
                            (b.joinedAt || 0)
                    );

                if (!players.length)
                    return;

                const current =
                    players[
                        turnIndex %
                        players.length
                    ];

                if (!current)
                    return;

                turnPlayer.textContent =
                    current.name;

                const isMyTurn =
                    current.id === playerId;

                rollButton.disabled =
                    !isMyTurn;

                if (isMyTurn) {

                    status.textContent =
                        "🎲 Giliran kamu — lempar dadu!";

                } else {

                    status.textContent =
                        `⏳ Menunggu ${current.name}`;
                }
            }
        );
    }
);


/* =====================================================
   PION DARI FIREBASE
===================================================== */

onValue(
    ref(
        db,
        `rooms/${roomId}/pieces`
    ),
    snapshot => {

        const data =
            snapshot.val();

        if (!data)
            return;

        colors.forEach(
            color => {

                for (
                    let i = 0;
                    i < PIECES_PER_PLAYER;
                    i++
                ) {

                    const value =
                        data[color]?.[i];

                    if (
                        typeof value ===
                        "number"
                    ) {

                        pieceState[color][i] =
                            value;
                    }
                }
            }
        );

        renderPieces();
    }
);


/* =====================================================
   RENDER PEMAIN
===================================================== */

function renderPlayers(list) {

    const elements =
        document.querySelectorAll(
            ".player"
        );

    elements.forEach(
        (element, index) => {

            const player =
                list[index];

            const nameElement =
                element.querySelector(
                    "div:last-child"
                );

            if (!player) {

                element.style.opacity =
                    ".35";

                if (nameElement) {

                    nameElement.textContent =
                        `Player ${index + 1}`;
                }

                return;
            }

            element.style.opacity =
                "1";

            if (nameElement) {

                nameElement.textContent =
                    player.name +
                    (
                        player.id === playerId
                            ? " (KAMU)"
                            : ""
                    );
            }

            element.style.borderColor =
                colorHex[
                    player.color
                ] || "#332040";
        }
    );
}


/* =====================================================
   RENDER PION
===================================================== */

function renderPieces() {

    piecesLayer.innerHTML =
        "";

    colors.forEach(
        color => {

            pieceState[color]
                .forEach(
                    (position, index) => {

                        const piece =
                            document.createElement(
                                "div"
                            );

                        piece.className =
                            `savari-piece ${color}`;

                        piece.dataset.color =
                            color;

                        piece.dataset.index =
                            index;

                        const number =
                            document.createElement(
                                "span"
                            );

                        number.className =
                            "savari-piece-number";

                        number.textContent =
                            index + 1;

                        piece.appendChild(
                            number
                        );

                        const coords =
                            getPieceCoordinates(
                                color,
                                index,
                                position
                            );

                        piece.style.left =
                            coords.x + "%";

                        piece.style.top =
                            coords.y + "%";

                        piece.addEventListener(
                            "click",
                            () => {

                                selectPiece(
                                    color,
                                    index
                                );
                            }
                        );

                        piecesLayer.appendChild(
                            piece
                        );
                    }
                );
        }
    );
}


/* =====================================================
   KOORDINAT PION
===================================================== */

function getPieceCoordinates(
    color,
    index,
    position
) {

    if (position < 0) {

        const home =
            homePositions[color][index];

        return {
            x:
                (home[0] / 15) * 100,

            y:
                (home[1] / 15) * 100
        };
    }


    const safePosition =
        Math.min(
            position,
            path.length - 1
        );

    const cell =
        path[
            safePosition
        ];

    return {
        x:
            ((cell[0] + .5) / 15) * 100,

        y:
            ((cell[1] + .5) / 15) * 100
    };
}


/* =====================================================
   PILIH PION
===================================================== */

function selectPiece(
    color,
    index
) {

    if (color !== myColor)
        return;

    if (rollButton.disabled)
        return;

    const currentPosition =
        pieceState[color][index];

    const gameSnapshot =
        window.savariGame;

    if (!gameSnapshot)
        return;

    const diceValue =
        Number(
            gameSnapshot.dice || 1
        );

    /*
       Kalau masih di rumah,
       wajib mendapat 6.
    */

    if (
        currentPosition < 0 &&
        diceValue !== 6
    ) {

        status.textContent =
            "❌ Pion hanya bisa keluar jika dadu 6.";

        return;
    }


    let newPosition;

    if (
        currentPosition < 0
    ) {

        newPosition = 0;

    } else {

        newPosition =
            currentPosition +
            diceValue;
    }


    if (
        newPosition >=
        path.length
    ) {

        newPosition =
            path.length - 1;
    }


    const pieces =
        {};

    colors.forEach(
        c => {

            pieces[c] =
                [...pieceState[c]];
        }
    );


    pieces[color][index] =
        newPosition;


    update(
        ref(
            db,
            `rooms/${roomId}/pieces`
        ),
        pieces
    )
    .then(() => {

        status.textContent =
            `✅ ${color.toUpperCase()} Pion ${index + 1} bergerak ${diceValue} langkah.`;

        const elements =
            document.querySelectorAll(
                `.savari-piece.${color}`
            );

        if (elements[index]) {

            elements[index]
                .classList.add(
                    "moving"
                );

            setTimeout(
                () => {

                    elements[index]
                        .classList.remove(
                            "moving"
                        );

                },
                400
            );
        }

    })
    .catch(error => {

        console.error(error);

        status.textContent =
            "❌ Gagal memindahkan pion.";

        status.className =
            "status error";
    });
}


/* =====================================================
   DADU
===================================================== */

rollButton.addEventListener(
    "click",
    async () => {

        if (
            rollButton.disabled
        )
            return;

        try {

            const gameSnapshot =
                await new Promise(
                    (resolve, reject) => {

                        onValue(
                            gameRef,
                            resolve,
                            reject,
                            {
                                onlyOnce:
                                    true
                            }
                        );
                    }
                );

            const game =
                gameSnapshot.val() ||
                {};

            const playersSnapshot =
                await new Promise(
                    (resolve, reject) => {

                        onValue(
                            playersRef,
                            resolve,
                            reject,
                            {
                                onlyOnce:
                                    true
                            }
                        );
                    }
                );

            const players =
                Object.values(
                    playersSnapshot.val() ||
                    {}
                ).sort(
                    (a, b) =>
                        (a.joinedAt || 0) -
                        (b.joinedAt || 0)
                );

            if (!players.length)
                return;

            const turnIndex =
                Number(
                    game.turnIndex || 0
                ) % players.length;

            const currentPlayer =
                players[turnIndex];

            if (
                !currentPlayer ||
                currentPlayer.id !== playerId
            ) {

                status.textContent =
                    "⏳ Belum giliran kamu.";

                return;
            }


            const value =
                Math.floor(
                    Math.random() * 6
                ) + 1;


            rollButton.disabled =
                true;


            let count = 0;

            const animation =
                setInterval(
                    () => {

                        dice.textContent =
                            Math.floor(
                                Math.random() *
                                6
                            ) + 1;

                        count++;

                        if (
                            count >= 10
                        ) {

                            clearInterval(
                                animation
                            );

                            dice.textContent =
                                value;
                        }

                    },
                    80
                );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        900
                    )
            );


            await update(
                gameRef,
                {
                    dice:
                        value,

                    started:
                        true
                }
            );


            /*
               Simpan game ke window
               supaya pion tahu angka dadu.
            */

            window.savariGame = {
                ...game,
                dice: value
            };


            /*
               Jika 6:
               pemain diberi kesempatan
               memilih pion.
            */

            if (value === 6) {

                status.textContent =
                    "🎲 Dapat 6! Pilih pion yang ingin digerakkan.";

                rollButton.disabled =
                    true;

                return;
            }


            /*
               Untuk sementara giliran
               tetap menunggu pilihan pion.
            */

            status.textContent =
                "🎯 Pilih pion kamu.";

        }
        catch (error) {

            console.error(
                "LUDO DICE ERROR:",
                error
            );

            status.textContent =
                "❌ Dadu gagal: " +
                error.message;

            status.className =
                "status error";

            rollButton.disabled =
                false;
        }
    }
);


/* =====================================================
   SIMPAN GAME TERAKHIR
===================================================== */

onValue(
    gameRef,
    snapshot => {

        const game =
            snapshot.val();

        if (game) {

            window.savariGame =
                game;
        }
    }
);


/* =====================================================
   DISCONNECT
===================================================== */

onDisconnect(
    playerRef
).remove();


/* =====================================================
   STATUS AWAL
===================================================== */

status.textContent =
    "🟢 Firebase terhubung — Room siap";

status.className =
    "status";
