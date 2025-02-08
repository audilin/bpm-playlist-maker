const clientId = "64adb86ea0524bb4bd3129d85a817525";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  const accessToken = await getAccessToken(clientId, code);
  const profile = await fetchProfile(accessToken);
  // const likedSongs = await fetchLikedSongs(accessToken);
  const allTracks = await getAllSavedTracks(accessToken);
  console.log(profile);
  populateUI(profile);
  // console.log(likedSongs);
  console.log(allTracks);
}

export async function redirectToAuthCodeFlow(clientId: string) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email user-library-read");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getAccessToken(clientId: string, code: string): Promise<string> {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("code_verifier", verifier!);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const { access_token } = await result.json();
  return access_token;
}

function generateCodeVerifier(length: number) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function fetchProfile(token: string): Promise<any> {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET", headers: { Authorization: `Bearer ${token}` }
  });

  return await result.json();
}

// will get first 20 saved tracks
async function fetchLikedSongs(token: string): Promise<any> {
  const result = await fetch("https://api.spotify.com/v1/me/tracks", {
    method: "GET", headers: { Authorization: `Bearer ${token}` }
  });

  return await result.json();
}

// will get ALL saved tracks, filtered to id + uri
async function getAllSavedTracks(accessToken: string): Promise<any> {
  let allTracks = [];
  let url: string | null = "https://api.spotify.com/v1/me/tracks?market=US&limit=50";
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  while (url) {
    const response = await fetch(url, { headers });
    const data = await response.json();

    if (data.items) {
      allTracks.push(...data.items.map(item => ({ id: item.track.id, uri: item.track.uri })));
    }

    url = data.next; // URL for next page, or null if no more tracks
  }

  return allTracks;
}

function populateUI(profile: any) {
  document.getElementById("displayName")!.innerText = profile.display_name;
  if (profile.images[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar")!.appendChild(profileImage);
  }
  document.getElementById("id")!.innerText = profile.id;
  document.getElementById("email")!.innerText = profile.email;
  document.getElementById("uri")!.innerText = profile.uri;
  document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url")!.innerText = profile.href;
  document.getElementById("url")!.setAttribute("href", profile.href);
  document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
}

function populateSavedTracks(likedSongs: any) {
  const tracksList = document.getElementById("tracksList")!;
  tracksList.innerHTML = '';  // Clear the list before adding new tracks

  if (likedSongs.items && Array.isArray(likedSongs.items)) {
    likedSongs.items.forEach((track: any) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `${track.track.name} by ${track.track.artists.map((artist: any) => artist.name).join(', ')}`;
      tracksList.appendChild(listItem);
    });
  } else {
    const listItem = document.createElement("li");
    listItem.innerHTML = "No liked tracks found.";
    tracksList.appendChild(listItem);
  }
}
