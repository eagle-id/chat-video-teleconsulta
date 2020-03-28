

function init() {
  document.addEventListener('DOMContentLoaded', openUserMedia);
}

async function openUserMedia(e) {
  console.log('open')
  const stream = await navigator.mediaDevices.getUserMedia(
      {video: true, audio: true});

  localStream = stream;
  remoteStream = new MediaStream();
  window.location.href  ="line.html";

}





init();
