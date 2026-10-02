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

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

const roomText = document.getElementById("roomId");
const dice = document.getElementById("dice");
const rollButton = document.getElementById("rollButton");
const turnPlayer = document.getElementById("turnPlayer");
const status = document.getElementById("status");

if (!roomId) {
    roomText.textContent = "BELUM ADA";
    status.textContent = "❌ Room ID belum tersedia.";
    status.className = "status error";
    throw new Error("Room ID tidak ditemukan.");
}

roomText.textContent = roomId;

let playerId = localStorage.getItem("savariLudoPlayerId");

if (!playerId) {
    playerId =
        "player_" +
        Math.random().toString(36).substring(2, 10);

    localStorage.setItem(
        "savariLudoPlayerId",
        playerId
    );
}

const colors = [
    "red",
    "blue",
    "green",
    "yellow"
];

const playerRef = ref(
    db,
    `rooms/${roomId}/players/${playerId}`
);

const roomRef = ref(
    db,
    `rooms/${roomId}`
);

const playersRef = ref(
    db,
    `rooms/${roomId}/players`
);

let myColor = null;

/* =========================
   CEK / BUAT ROOM
========================= */

onValue(
    roomRef,
    async (snapshot) => {

        const room = snapshot.val();

        if (!room) {

            await set(roomRef, {
                createdAt: Date.now(),
                game: {
                    turnIndex: 0,
                    dice: 1,
                    started: false
                }
            });

            return;
        }

        if (!room.game) {

            await update(roomRef, {
                game: {
                    turnIndex: 0,
                    dice: 1,
                    started: false
                }
            });
        }
    },
    (error) => {

        console.error(error);

        status.textContent =
            "❌ Tidak bisa membaca Firebase.";

        status.className = "status error";
    }
);

/* =========================
   DAFTAR PEMAIN
========================= */

onValue(
    playersRef,
    async (snapshot) => {

        const players = snapshot.val() || {};

        const list = Object.values(players)
            .sort(
                (a, b) =>
                    (a.joinedAt || 0) -
                    (b.joinedAt || 0)
            );

        /*
         * Maksimal 4 pemain.
         */
        if (
            !players[playerId] &&
            list.length >= 4
        ) {

            status.textContent =
                "❌ Room sudah penuh.";

            status.className =
                "status error";

            rollButton.disabled = true;

            return;
        }

        /*
         * Tentukan warna berdasarkan urutan.
         */
        if (players[playerId]) {

            const index = list.findIndex(
                p => p.id === playerId
            );

            myColor =
                players[playerId].color ||
                colors[index] ||
                "red";

        } else {

            const usedColors =
                list.map(p => p.color);

            const freeColor =
                colors.find(
                    c => !usedColors.includes(c)
                ) || "red";

            myColor = freeColor;

            const newPlayer = {

                id: playerId,

                name:
                    "Player " +
                    (list.length + 1),

                color: myColor,

                joinedAt: Date.now(),

                connected: true
            };

            await set(
                playerRef,
                newPlayer
            );
        }

        /*
         * Tampilkan pemain di papan.
         */
        renderPlayers(list);

        status.textContent =
            `🟢 ${list.length}/4 pemain terhubung`;

        status.className = "status";

    },
    (error) => {

        console.error(error);

        status.textContent =
            "❌ Firebase error: " +
            error.message;

        status.className =
            "status error";
    }
);

/* =========================
   RENDER PEMAIN
========================= */

function renderPlayers(list) {

    const playerElements =
        document.querySelectorAll(".player");

    playerElements.forEach(
        (element, index) => {

            const player = list[index];

            const nameElement =
                element.querySelector("div:last-child");

            if (!player) {

                element.style.opacity = "0.35";

                if (nameElement) {
                    nameElement.textContent =
                        `Player ${index + 1}`;
                }

                element.classList.remove(
                    "active"
                );

                return;
            }

            element.style.opacity = "1";

            if (nameElement) {

                nameElement.textContent =
                    player.name +
                    (
                        player.id === playerId
                            ? " (KAMU)"
                            : ""
                    );
            }

            element.classList.remove(
                "active"
            );

            if (player.color) {

                element.style.borderColor =
                    getColor(player.color);
            }
        }
    );
}

/* =========================
   GILIRAN + DADU
========================= */

onValue(
    ref(db, `rooms/${roomId}/game`),
    (snapshot) => {

        const game =
            snapshot.val();

        if (!game) return;

        dice.textContent =
            game.dice || "1";

        onValue(
            playersRef,
            (playerSnapshot) => {

                const players =
                    Object.values(
                        playerSnapshot.val() || {}
                    ).sort(
                        (a, b) =>
                            (a.joinedAt || 0) -
                            (b.joinedAt || 0)
                    );

                if (!players.length) return;

                const current =
                    players[
                        game.turnIndex %
                        players.length
                    ];

                if (!current) return;

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
                        `⏳ Menunggu giliran ${current.name}`;
                }

            }
        );
    }
);

/* =========================
   TOMBOL DADU
========================= */

rollButton.addEventListener(
    "click",
    async () => {

        rollButton.disabled = true;

        const gameSnapshot =
            await new Promise(
                resolve => {

                    onValue(
                        ref(
                            db,
                            `rooms/${roomId}/game`
                        ),
                        resolve,
                        { onlyOnce: true }
                    );

                }
            );

        const game =
            gameSnapshot.val() || {};

        const playersSnapshot =
            await new Promise(
                resolve => {

                    onValue(
                        playersRef,
                        resolve,
                        { onlyOnce: true }
                    );

                }
            );

        const players =
            Object.values(
                playersSnapshot.val() || {}
            ).sort(
                (a, b) =>
                    (a.joinedAt || 0) -
                    (b.joinedAt || 0)
            );

        if (!players.length) return;

        const currentPlayer =
            players[
                (game.turnIndex || 0) %
                players.length
            ];

        if (
            !currentPlayer ||
            currentPlayer.id !== playerId
        ) {

            return;
        }

        const value =
            Math.floor(
                Math.random() * 6
            ) + 1;

        dice.textContent = value;

        await update(
            ref(
                db,
                `rooms/${roomId}/game`
            ),
            {
                dice: value
            }
        );

        /*
         * Efek angka dadu.
         */
        let count = 0;

        const animation =
            setInterval(
                () => {

                    dice.textContent =
                        Math.floor(
                            Math.random() * 6
                        ) + 1;

                    count++;

                    if (count >= 8) {

                        clearInterval(
                            animation
                        );

                        dice.textContent =
                            value;
                    }

                },
                70
            );

        /*
         * Setelah dadu dilempar,
         * giliran pindah.
         */
        setTimeout(
            async () => {

                const nextIndex =
                    (
                        (game.turnIndex || 0) +
                        1
                    ) % players.length;

                await update(
                    ref(
                        db,
                        `rooms/${roomId}/game`
                    ),
                    {
                        dice: value,
                        turnIndex: nextIndex,
                        started: true
                    }
                );

            },
            900
        );
    }
);

/* =========================
   DISCONNECT
========================= */

onDisconnect(playerRef)
    .remove();

/* =========================
   UTILITAS
========================= */

function getColor(color) {

    const map = {

        red: "#ef4444",

        blue: "#3b82f6",

        green: "#22c55e",

        yellow: "#eab308"
    };

    return map[color] || "#a855f7";
                        }
