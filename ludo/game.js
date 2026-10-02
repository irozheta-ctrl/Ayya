import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    onValue,
    onDisconnect
}
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";


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


const params =
    new URLSearchParams(window.location.search);

const roomId =
    params.get("room");


const roomText =
    document.getElementById("roomId");

const playersBox =
    document.getElementById("players");

const countText =
    document.getElementById("count");

const status =
    document.getElementById("status");


if (!roomId) {

    roomText.textContent = "BELUM ADA";

    status.textContent =
        "❌ Room ID belum tersedia.";

    status.className =
        "status error";

    throw new Error("Room ID tidak ditemukan.");
}


roomText.textContent = roomId;


// ===============================
// PLAYER ID
// ===============================

let playerId =
    localStorage.getItem("savariLudoPlayerId");


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


// ===============================
// PLAYER COLOR
// ===============================

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


// ===============================
// PLAYER DATA
// ===============================

const playerRef =
    ref(
        db,
        `rooms/${roomId}/players/${playerId}`
    );


const playerData = {
    id: playerId,
    name: "Player",
    connected: true,
    joinedAt: Date.now()
};


set(playerRef, playerData)

    .then(() => {

        status.textContent =
            "🟢 Firebase terhubung — Room siap";

    })

    .catch((error) => {

        console.error(error);

        status.textContent =
            "❌ Firebase error: " +
            error.message;

        status.className =
            "status error";
    });


onDisconnect(playerRef)
    .remove();


// ===============================
// READ PLAYERS
// ===============================

const playersRef =
    ref(
        db,
        `rooms/${roomId}/players`
    );


onValue(
    playersRef,

    (snapshot) => {

        const players =
            snapshot.val() || {};

        const list =
            Object.values(players);

        countText.textContent =
            `${list.length} / 4 PLAYERS`;


        playersBox.innerHTML = "";


        if (list.length === 0) {

            playersBox.innerHTML =
                `<div class="empty">
                    Menunggu pemain...
                </div>`;

            return;
        }


        list
            .sort(
                (a, b) =>
                    a.joinedAt - b.joinedAt
            )
            .forEach(
                (player, index) => {

                    const color =
                        colors[index] || "red";

                    const div =
                        document.createElement("div");

                    div.className = "player";


                    const dot =
                        document.createElement("div");

                    dot.className = "dot";

                    dot.style.color =
                        colorHex[color];

                    dot.style.background =
                        colorHex[color];


                    const name =
                        document.createElement("div");

                    name.className =
                        "player-name";

                    name.textContent =
                        player.name || "Player";


                    if (
                        player.id === playerId
                    ) {

                        name.innerHTML +=
                            ` <span class="you">(KAMU)</span>`;

                    }


                    div.appendChild(dot);
                    div.appendChild(name);

                    playersBox.appendChild(div);

                }
            );


        if (list.length >= 4) {

            status.textContent =
                "🟢 Room penuh — 4 pemain";

        } else {

            status.textContent =
                `🟢 Menunggu pemain — ${list.length}/4`;

        }

    },

    (error) => {

        console.error(error);

        status.textContent =
            "❌ Tidak bisa membaca database.";

        status.className =
            "status error";
    }
);
