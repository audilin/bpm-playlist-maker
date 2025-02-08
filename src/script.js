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
  const songInfo = await fetchSongBPMs(allTracks);

//   console.log("Changed allTracks");
//   console.log(allTracks);
  const [filteredData, description] = getRightSongs(songInfo, 0, 150);
  console.log("Filtered Data and description:");
  console.log(filteredData);
  console.log(description);
  try {
    console.log("Creating playlist...");
    const playlistId = await createPlaylist(accessToken, profile.id, "0-150 BPM Playlist", description);
    console.log("Playlist created successfully! ID:", playlistId);
    await addTracksToPlaylist(accessToken, playlistId, filteredData);
  } catch (error) {
    console.error("Failed to create playlist:", error);
  }
//   const playlistId = await createPlaylist(accessToken, profile.id, "120-130 BPM Playlist", description);
//   addTracksToPlaylist(accessToken, playlistId, filteredData);
}
export async function redirectToAuthCodeFlow(clientId2) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("verifier", verifier);
  const params2 = new URLSearchParams();
  params2.append("client_id", clientId2);
  params2.append("response_type", "code");
  params2.append("redirect_uri", "https://www.andrew.cmu.edu/user/fellerma/bpm-playlist-maker/");
  params2.append("scope", "user-read-private user-read-email user-library-read playlist-modify-public playlist-modify-private");
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

// async function fetchSongBPMs(songs) {
//     const songInfo = [];
//     songs.forEach(async song => {
//         try {
//             console.log(song.title)
//             console.log(song.artist)
//             const response = await fetchGetSongBPM(String(song.title), String(song.artist));
//             console.log(response);
//             if (response && response.search.length > 0) {
//                 song.tempo = response.search[0].tempo;
//                 songInfo.push(song);
//             } else {
//                 song.tempo = 0.0; // Handle cases where no tempo is found
//                 console.error(`No response recieved for ${song.title}`);
//             }
//         } catch (error) {
//             console.error(`Error fetching BPM for ${song.title} by ${song.artist}:`, error);
//             song.tempo = 0.0;
//         }
//     })
//     return songInfo;
// }
  
  async function fetchSongBPMs(songs) {
    const songInfo = [];
    for (const song of songs) {
      try {
        console.log(song.title);
        console.log(song.artist);
        const response = await fetchGetSongBPM(String(song.title), String(song.artist));
        console.log(response);
        if (response && response.search.length > 0) {
          song.tempo = response.search[0].tempo;
          songInfo.push(song);
        } else {
          song.tempo = 0.0;
          console.error(`No response received for ${song.title}`);
        }
      } catch (error) {
        console.error(`Error fetching BPM for ${song.title} by ${song.artist}:`, error);
        song.tempo = 0.0;
      }
    }
    return songInfo;
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

// Function to create a new playlist for the user
async function createPlaylist(accessToken, userId, playlistName, playlistDescription) {
  
  const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: playlistName,
      description:playlistDescription,
      public: false, // Set to true for a public playlist, false for private
      collaborative: false, // Set to true for collaborative playlists
    }),
  });

  const playlist = await response.json();
  return playlist.id; // Return the ID of the created playlist
}

// Function to add filtered tracks to the newly created playlist
async function addTracksToPlaylist(accessToken, playlistId, filteredData) {
  const trackUris = filteredData.map(song => song.uri); // Get the URIs of the tracks

  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: trackUris,  // An array of Spotify track URIs to be added
    }),
  });

  const result = await response.json();
  console.log('Tracks added:', result);
}

function getRightSongs(songInfo, minBPM, maxBPM){
  // Filter objects within the range
  console.log("songInfo");
  console.log(songInfo);
  const filteredData = songInfo.filter(song => checkRange(song,minBPM,maxBPM));
//   (parseInt(song.tempo) >= minBPM && parseInt(song.tempo) <= maxBPM))
  console.log("filteredData");
  console.log(filteredData);
  let changeBPMat = "";
  let prevBpm = null;

  for (const song of filteredData) {
    if (song.tempo !== prevBpm) {
      changeBPMat += song.tempo + "-->" + song.title + " ,";
    }
    prevBpm = song.tempo;
  }

  return [filteredData, changeBPMat];
}

function checkRange(song, minBPM, maxBPM){
    console.log(song.tempo);
    console.log(parseInt(song.tempo));
    return (parseInt(song.tempo) >= minBPM && parseInt(song.tempo) <= maxBPM);
}