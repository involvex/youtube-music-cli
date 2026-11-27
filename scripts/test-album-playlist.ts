import { Innertube } from "youtubei.js";

async function test() {
  const yt = await Innertube.create();

  // Try fetching an album and playlist
  // Use a known album browseId MPREb_4pL8gzTRrcJ
  console.log("\n--- FETCH ALBUM ---");
  try {
    const album = await yt.music.getAlbum("MPREb_4pL8gzTRrcJ");
    console.log("Album tracks limit 1:");
    console.dir(album.contents.slice(0, 1), { depth: null });
  } catch (e) {
    console.error(e);
  }

  // Use a known playlist from New Releases maybe? "VL..." -> prefix is usually "VL" or "PL"
  console.log("\n--- FETCH PLAYLIST ---");
  try {
    const pl = await yt.music.getPlaylist("PL4fGSI1pDJn6O1LS0XSdF3RyO0Rq_LDeI");
    console.log("Playlist items limit 1:");
    console.dir(pl.items.slice(0, 1), { depth: null });
  } catch (e) {
    console.error(e);
  }
}

test().catch(console.error);
