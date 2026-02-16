import { google } from "googleapis";

export async function createPlaylist(tokens, mood) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);

  const youtube = google.youtube({ version: "v3", auth });

  const playlist = await youtube.playlists.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: `MoodMirror – ${mood}`,
        description: `Generated based on detected mood: ${mood}`,
      },
      status: {
        privacyStatus: "unlisted",
      },
    },
  });

  return playlist.data.id;
}

export async function addVideo(tokens, playlistId, videoId) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);

  const youtube = google.youtube({ version: "v3", auth });

  await youtube.playlistItems.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    },
  });
}
