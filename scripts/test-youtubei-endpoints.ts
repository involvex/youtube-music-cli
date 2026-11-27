import { Innertube } from "youtubei.js";

async function test() {
  const yt = await Innertube.create();

  // 1. New Releases
  console.log("\n--- NEW RELEASES ---");
  const nr = await yt.actions.execute("/browse", {
    browseId: "FEmusic_new_releases",
    client: "YTMUSIC",
  });
  const nrData = nr.data;
  console.log(Object.keys(nrData));
  if (nrData.contents) {
    console.log("Contents key:", Object.keys(nrData.contents));
  }

  // 2. Moods & Genres
  console.log("\n--- MOODS & GENRES ---");
  const mg = await yt.actions.execute("/browse", {
    browseId: "FEmusic_moods_and_genres",
    client: "YTMUSIC",
  });
  const mgData = mg.data;
  console.log(Object.keys(mgData));
}

test().catch(console.error);
