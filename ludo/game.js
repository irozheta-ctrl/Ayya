import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
getDatabase,
ref,
set,
update,
onValue,
onDisconnect
}
from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";


const firebaseConfig={
apiKey:"AIzaSyALjjBvSRi37TEVKbUTXRKRQ90e07kcNgA",
authDomain:"savari-ludo.firebaseapp.com",
databaseURL:"https://savari-ludo-default-rtdb.asia-southeast1.firebasedatabase.app",
projectId:"savari-ludo",
storageBucket:"savari-ludo.firebasestorage.app",
messagingSenderId:"882276906132",
appId:"1:882276906132:web:64f21c73ebce582a447081"
};

const app=initializeApp(firebaseConfig);
const db=getDatabase(app);

const params=new URLSearchParams(location.search);
const roomId=params.get("room");

const roomText=document.getElementById("roomId");
const board=document.getElementById("board");
const dice=document.getElementById("dice");
const rollButton=document.getElementById("rollButton");
const turnPlayer=document.getElementById("turnPlayer");
const status=document.getElementById("status");

if(!roomId){
status.textContent="❌ Room tidak ditemukan.";
status.className="status error";
throw new Error("Room ID tidak ada");
}

roomText.textContent=roomId;


/* PLAYER ID */

let playerId=localStorage.getItem("savariLudoPlayerId");

if(!playerId){

playerId=
"p_"+Math.random()
.toString(36)
.substring(2,10);

localStorage.setItem(
"savariLudoPlayerId",
playerId
);
}


/* REFERENCES */

const roomRef=ref(
db,
`rooms/${roomId}`
);

const playersRef=ref(
db,
`rooms/${roomId}/players`
);

const gameRef=ref(
db,
`rooms/${roomId}/game`
);

const piecesRef=ref(
db,
`rooms/${roomId}/pieces`
);

const myPlayerRef=ref(
db,
`rooms/${roomId}/players/${playerId}`
);


/* COLORS */

const colors=[
"red",
"blue",
"green",
"yellow"
];

const colorHex={
red:"#ef4444",
blue:"#3b82f6",
green:"#22c55e",
yellow:"#eab308"
};


/* PATH */

const path=[
[7,1],[8,1],[9,1],
[9,2],[9,3],[9,4],[9,5],[9,6],
[10,7],[11,7],[12,7],[13,7],[14,7],
[15,7],[15,8],[15,9],
[14,9],[13,9],[12,9],[11,9],[10,9],
[9,10],[9,11],[9,12],[9,13],[9,14],[9,15],
[8,15],[7,15],
[7,14],[7,13],[7,12],[7,11],[7,10],
[6,9],[5,9],[4,9],[3,9],[2,9],[1,9],
[1,8],[1,7],
[2,7],[3,7],[4,7],[5,7],[6,7],
[7,6],[7,5],[7,4],[7,3],[7,2]
];


/* HOME */

const home={
red:[[3,3],[5,3],[3,5],[5,5]],
blue:[[11,3],[13,3],[11,5],[13,5]],
green:[[3,11],[5,11],[3,13],[5,13]],
yellow:[[11,11],[13,11],[11,13],[13,13]]
};


/* LOCAL STATE */

let myColor=null;
let players=[];
let game={
turnIndex:0,
dice:1
};

let pieces={
red:[-1,-1,-1,-1],
blue:[-1,-1,-1,-1],
green:[-1,-1,-1,-1],
yellow:[-1,-1,-1,-1]
};


/* CREATE ROOM */

onValue(
roomRef,
async snap=>{

if(!snap.exists()){

await set(
roomRef,
{
createdAt:Date.now(),
game:{
turnIndex:0,
dice:1,
rolling:false
}
}
);

}
},
{onlyOnce:true}
);


/* JOIN */

onValue(
playersRef,
async snap=>{

const data=snap.val()||{};

players=Object.values(data)
.sort(
(a,b)=>
(a.joinedAt||0)-
(b.joinedAt||0)
);

let me=data[playerId];

if(!me){

if(players.length>=4){

status.textContent=
"❌ Room sudah penuh.";

status.className=
"status error";

rollButton.disabled=true;

return;
}

const index=players.length;

myColor=colors[index];

me={
id:playerId,
name:`Player ${index+1}`,
color:myColor,
joinedAt:Date.now()
};

await set(
myPlayerRef,
me
);

players.push(me);

}else{

myColor=me.color;

}

renderPlayers();

renderPieces();

updateTurn();

},
error=>{
status.textContent=
"❌ Firebase error.";

status.className=
"status error";
}
);


/* DISCONNECT */

onDisconnect(
myPlayerRef
).remove();


/* GAME */

onValue(
gameRef,
snap=>{

const data=snap.val();

if(!data)return;

game=data;

dice.textContent=
data.dice||1;

updateTurn();

}
);


/* PIECES */

onValue(
piecesRef,
snap=>{

const data=snap.val();

if(!data)return;

colors.forEach(color=>{

if(Array.isArray(data[color])){

pieces[color]=
data[color].slice(0,4);

}

});

renderPieces();

}
);


/* PLAYERS */

function renderPlayers(){

players.forEach(
(player,index)=>{

const name=
document.getElementById(
`playerName${index}`
);

const card=
document.getElementById(
`playerCard${index}`
);

if(name){

name.textContent=
player.name+
(
player.id===playerId
?" (KAMU)"
:""
);

}

if(card){

card.style.borderColor=
colorHex[player.color];

card.classList.toggle(
"active",
player.id===playerId
);

}

}
);

for(
let i=players.length;
i<4;
i++
){

const name=
document.getElementById(
`playerName${i}`
);

if(name)
name.textContent="Menunggu";

}
}


/* TURN */

function updateTurn(){

if(!players.length)return;

const current=
players[
Number(game.turnIndex||0)
%players.length
];

if(!current)return;

turnPlayer.textContent=
current.name;

const mine=
current.id===playerId;

rollButton.disabled=
!mine;

if(mine){

status.textContent=
"🎲 Giliran kamu — lempar dadu.";

}else{

status.textContent=
`⏳ Menunggu ${current.name}`;

}
}


/* ROLL */

rollButton.addEventListener(
"click",
async()=>{

if(rollButton.disabled)
return;

const value=
Math.floor(
Math.random()*6
)+1;

let n=0;

const anim=
setInterval(
()=>{

dice.textContent=
Math.floor(
Math.random()*6
)+1;

n++;

if(n>=8){

clearInterval(anim);

dice.textContent=value;

}

},
80
);

await new Promise(
r=>setTimeout(r,700)
);

await update(
gameRef,
{
dice:value,
rolling:false
}
);

status.textContent=
value===6
?"🎉 Dapat 6! Pilih pion."
:"🎯 Pilih pion yang ingin digerakkan.";

highlightPieces();

}
);


/* PIECE RENDER */

function renderPieces(){

document
.querySelectorAll(".piece")
.forEach(
el=>el.remove()
);

colors.forEach(
color=>{

pieces[color].forEach(
(position,index)=>{

const el=
document.createElement("div");

el.className=
`piece ${color}`;

el.dataset.color=color;
el.dataset.index=index;

const pos=
position<0
?home[color][index]
:path[
Math.min(
position,
path.length-1
)
];

el.style.left=
`${pos[0]/15*100}%`;

el.style.top=
`${pos[1]/15*100}%`;

el.title=
`${color} ${index+1}`;

el.addEventListener(
"click",
()=>movePiece(
color,
index
)
);

board.appendChild(el);

}
);

}
);

}


/* HIGHLIGHT */

function highlightPieces(){

document
.querySelectorAll(".piece")
.forEach(
el=>{

el.classList.remove(
"selectable"
);

if(
el.dataset.color===myColor
){

el.classList.add(
"selectable"
);

}

}
);

}


/* MOVE */

async function movePiece(
color,
index
){

if(color!==myColor)
return;

const current=
players[
Number(game.turnIndex||0)
%players.length
];

if(
!current ||
current.id!==playerId
)
return;

const roll=
Number(game.dice||1);

let position=
pieces[color][index]??-1;


/* KELUAR */

if(position<0){

if(roll!==6){

status.textContent=
"❌ Pion harus mendapat 6.";

return;

}

position=0;

}else{

position+=roll;

if(position>=path.length)
position=path.length-1;

}


/* SAVE */

const next={
red:[...pieces.red],
blue:[...pieces.blue],
green:[...pieces.green],
yellow:[...pieces.yellow]
};

next[color][index]=position;

await set(
piecesRef,
next
);


/* GILIRAN */

let nextTurn=
Number(game.turnIndex||0);

if(roll!==6){

nextTurn=
(nextTurn+1)
%players.length;
}

await update(
gameRef,
{
dice:1,
turnIndex:nextTurn,
rolling:false
}
);

status.textContent=
roll===6
?"🎉 Dapat 6 — giliran kamu lagi."
:"⏳ Giliran berikutnya.";

}


/* INITIAL */

status.textContent=
"🟢 Firebase terhubung.";
