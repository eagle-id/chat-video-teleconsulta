
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
let connected = false;

function init() {
  document.addEventListener('DOMContentLoaded', openUserMedia);
  document.addEventListener('DOMContentLoaded', hideVideo);
}

async function openUserMedia(e) {
  const stream = await navigator.mediaDevices.getUserMedia(
    {video: true, audio: true});
  document.querySelector('#localVideo').srcObject = stream;
  localStream = stream;
  remoteStream = new MediaStream();
  document.querySelector('#remoteVideo').srcObject = remoteStream;

  console.log('Stream:', document.querySelector('#localVideo').srcObject);
  createRoom();

}

async function createRoom() {
  const db = firebase.firestore();
  const roomRef = await db.collection('rooms').doc();

  console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);

  registerPeerConnectionListeners();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Code for collecting ICE candidates below
  const callerCandidatesCollection = roomRef.collection('callerCandidates');

  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      return;
    }
    console.log('Got candidate: ', event.candidate);
    callerCandidatesCollection.add(event.candidate.toJSON());
  });
  // Code for collecting ICE candidates above

  // Code for creating a room below
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Created offer:', offer);

  const roomWithOffer = {
    'offer': {
      type: offer.type,
      sdp: offer.sdp,
    },
    'logEnterInLine': Date.now(),
  };
  
  await roomRef.set(roomWithOffer);
  roomId = roomRef.id;
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  // Code for creating a room above

  peerConnection.addEventListener('track', event => {
    console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  // Listening for remote session description below
  roomRef.onSnapshot(async snapshot => {
    const data = snapshot.data();
   
    if (!peerConnection.currentRemoteDescription && data.answer) {
      console.log('Começou o atendimento');
      console.log('Got remote description: ', data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
    }
  });
  // Listening for remote session description above

  // Listen for remote ICE candidates below
  roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        let data = change.doc.data();
        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  // Listen for remote ICE candidates above
  getLineInformation();
}

async function hangUp(e) {
  const tracks = document.querySelector('#localVideo').srcObject.getTracks();
  tracks.forEach(track => {
    track.stop();
  });

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  // Delete room on hangup
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    calleeCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    const callerCandidates = await roomRef.collection('callerCandidates').get();
    callerCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    await roomRef.delete();
  }

  document.location.reload(true);
}

function registerPeerConnectionListeners() {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
        `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
 
    if(`${peerConnection.connectionState}`=="disconnected"){
      goToEnd();
    }
     
    if(`${peerConnection.connectionState}`=="connected"){
      document.querySelector('#title').innerText =`Você está sendo atendido por: Nome do especialista`;
      connected = true;
      hideLineInformation();
    }
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
 
    
   // goToEnd();
    console.log(
        `ICE connection state change: ${peerConnection.iceConnectionState}`);
        
  });
}

function goToEnd(){
  window.location.href  ="end.html";
}

async function getLineInformation(){
  if(roomId != null){
    getMeOnLine();
  }
}


async function getMeOnLine(){ 
  document.querySelector('#meOnLine').innerText = `Pessoas na fila: Aguardando informações`; 
const db = firebase.firestore();
const line = db.collection('rooms');
var meOnLine = 0;
var myData =  await db.collection('rooms').doc(`${roomId}`).get();
checkLine = line.orderBy('logEnterInLine');

checkLine.get().then(function (querySnapshot) {
 
  querySnapshot.forEach(async function (doc) {  
        
      var roomRef = db.collection('rooms').doc(`${doc.id}`);
      var roomSnapshot = await roomRef.get();

      if(roomSnapshot.data().answer == null){
      if(roomSnapshot.data().logEnterInLine <= myData.data().logEnterInLine){
        meOnLine++; 
      }

      }
        document.querySelector('#meOnLine').innerText = `Existem  ${meOnLine} pessoas em sua frente na fila. Por favor, tenha paciência e permaneça conosco`; 
        document.querySelector('#myNumberOnLine').innerText = `${meOnLine}`;  
  
      });

});  


}
function hideVideo(){
  document.getElementById("remoteVideo").style.visibility = "hidden";
  document.getElementById("localVideo").style.visibility = "hidden";
}
function hideLineInformation(){
  document.getElementById("lineInfo").style.visibility = "hidden";;
  document.getElementById("remoteVideo").style.visibility = "";
}

window.setInterval(function(){
  if(connected==false){
  getLineInformation();
}else{
  hideLineInformation();
}}, 10000);

init();
