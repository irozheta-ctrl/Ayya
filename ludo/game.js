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

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

const status = document.getElementById("status");
const roomText = document.getElementById("roomId");

if (!roomId) {
    roomText.textContent = "BELUM ADA";

    status.textContent =
        "❌ Room ID belum tersedia.";

    status.className = "status error";

    throw new Error("Room ID tidak ditemukan.");
}

roomText.textContent = roomId;


// ==============================
// BUAT ID PLAYER
// ==============================

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


// ==============================
// REFERENSI ROOM
// ==============================

const playerRef = ref(
    db,
    `rooms/${roomId}/players/${playerId}`
);


// ==============================
// DATA PLAYER
// ==============================

const playerData = {
    id: playerId,
    name: "Player",
    color: "red",
    connected: true,
    joinedAt: Date.now()
};


// ==============================
// MASUK ROOM
// ==============================

set(playerRef, playerData)
    .then(() => {

        status.textContent =
            "🟢 Terhubung ke Firebase";

        status.className = "status";

        console.log(
            "🎮 Masuk room:",
            roomId
        );

    })
    .catch((error) => {

        console.error(error);

        status.textContent =
            "❌ Firebase error: " +
            error.message;

        status.className =
            "status error";
    });


// ==============================
// HAPUS PLAYER SAAT KELUAR
// ==============================

onDisconnect(playerRef)
    .remove();


// ==============================
// PANTAU PLAYER
// ==============================

const playersRef = ref(
    db,
    `rooms/${roomId}/players`
);

onValue(
    playersRef,
    (snapshot) => {

        const players =
            snapshot.val() || {};

        const jumlah =
            Object.keys(players).length;

        status.textContent =
            `🟢 Firebase aktif — ${jumlah} player`;

        console.log(
            "👥 Players:",
            players
        );

    },
    (error) => {

        console.error(error);

        status.textContent =
            "❌ Tidak bisa membaca database.";

        status.className =
            "status error";
    }
);
