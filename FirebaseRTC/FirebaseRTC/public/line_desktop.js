

const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;

function init() {
  document.addEventListener('DOMContentLoaded', getLineSize);
  document.querySelector('#GoToCall').addEventListener('click', goToCall);

}


async function getLineSize(){
  const db = firebase.firestore();
  const line = await db.collection('rooms');
  var lineSize = 0;
  checkLine = line.orderBy('logEnterInLine');
  
  
  checkLine.get().then(function (querySnapshot) {
     
    
    querySnapshot.forEach(async function (doc) {  
          
        var roomRef = db.collection('rooms').doc(`${doc.id}`);
        var roomSnapshot = await roomRef.get();
        if(roomSnapshot.data().answer == null){
        lineSize++;
        }
          document.querySelector('#NumberOnLine').innerText = `${lineSize}`; 
      });
  
  });  
}
function goToCall(){
  window.location.href  ="call_desktop.html";
}
window.setInterval(function(){
  getLineSize();
}, 3000);

init();
