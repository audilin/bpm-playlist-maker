const clientId = "64adb86ea0524bb4bd3129d85a817525";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  const accessToken = await getAccessToken(clientId, code);
  const profile = await fetchProfile(accessToken);
  const allTracks = await getAllSavedTracks(accessToken);
  console.log(profile);
  populateUI(profile);
  console.log(allTracks);
  const songInfo = fetchGetSongBPM("Someone Like You", "Adele");
  console.log(songInfo);
}
export async function redirectToAuthCodeFlow(clientId2) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("verifier", verifier);
  const params2 = new URLSearchParams();
  params2.append("client_id", clientId2);
  params2.append("response_type", "code");
  params2.append("redirect_uri", "https://www.andrew.cmu.edu/user/fellerma/bpm-playlist-maker/");
  params2.append("scope", "user-read-private user-read-email user-library-read");
  params2.append("code_challenge_method", "S256");
  params2.append("code_challenge", challenge);
  document.location = `https://accounts.spotify.com/authorize?${params2.toString()}`;
}
export async function getAccessToken(clientId2, code2) {
  const verifier = localStorage.getItem("verifier");
  const params2 = new URLSearchParams();
  params2.append("client_id", clientId2);
  params2.append("grant_type", "authorization_code");
  params2.append("code", code2);
  params2.append("redirect_uri", "https://www.andrew.cmu.edu/user/fellerma/bpm-playlist-maker/");
  params2.append("code_verifier", verifier);
  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params2
  });
  const { access_token } = await result.json();
  return access_token;
}
function generateCodeVerifier(length) {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)])).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  return await result.json();
}
async function fetchLikedSongs(token) {
  const result = await fetch("https://api.spotify.com/v1/me/tracks", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  return await result.json();
}
async function getAllSavedTracks(accessToken) {
  let allTracks = [];
  let url = "https://api.spotify.com/v1/me/tracks?market=US&limit=50";
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
  while (url) {
    const response = await fetch(url, { headers });
    const data = await response.json();
    if (data.items) {
      allTracks.push(...data.items.map((item) => ({ artist: item.track.artists[0].name, title: item.track.name, uri: item.track.uri })));
    }
    url = data.next;
  }
  return allTracks;
}

function formatString(str) {
    return str.toLowerCase().replace(/\s/g, '+');
}

async function fetchGetSongBPM(title, artist) {
    const finalUrl = `https://api.getsong.co/search/?api_key=7ad6367125260b8c7ceecd246c53ef7c&type=both&lookup=song:${formatString(title)}%20artist:${formatString(artist)}`;
    const result = await fetch(finalUrl);
    return await result.json();
}

function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(profileImage);
  }
  document.getElementById("id").innerText = profile.id;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
  document.getElementById("imgUrl").innerText = profile.images[0]?.url ?? "(no profile image)";
}
function populateSavedTracks(likedSongs) {
  const tracksList = document.getElementById("tracksList");
  tracksList.innerHTML = "";
  if (likedSongs.items && Array.isArray(likedSongs.items)) {
    likedSongs.items.forEach((track) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `${track.track.name} by ${track.track.artists.map((artist) => artist.name).join(", ")}`;
      tracksList.appendChild(listItem);
    });
  } else {
    const listItem = document.createElement("li");
    listItem.innerHTML = "No liked tracks found.";
    tracksList.appendChild(listItem);
  }
}