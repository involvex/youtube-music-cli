import { Innertube } from "youtubei.js";

async function test() {
  const yt = await Innertube.create();

  // 1. New Releases
  console.log("\n--- NEW RELEASES ---");
  const nr = await yt.actions.execute("/browse", {
    browseId: "FEmusic_new_releases",
    client: "YTMUSIC",
  });
  const nrData = nr.data as any;
  if (
    nrData.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents
  ) {
    const sections =
      nrData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        .content.sectionListRenderer.contents;
    console.log("Got sections:", sections.length);
    const items =
      sections[0]?.musicCarouselShelfRenderer?.contents ||
      sections[0]?.musicShelfRenderer?.contents ||
      sections[0]?.gridRenderer?.items ||
      [];
    console.log("First section items limit 3:");
    console.dir(items.slice(0, 3), { depth: null });
  }

  // 2. Moods & Genres
  console.log("\n--- MOODS & GENRES ---");
  const mg = await yt.actions.execute("/browse", {
    browseId: "FEmusic_moods_and_genres",
    client: "YTMUSIC",
  });
  const mgData = mg.data as any;
  if (
    mgData.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents
  ) {
    const sections =
      mgData.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        .content.sectionListRenderer.contents;
    console.log("Got generic sections:", sections.length);
    const items = sections[0]?.gridRenderer?.items || [];
    console.log("First section Generic genres limit 1:");
    console.dir(items.slice(0, 1), { depth: null });
  }
}

test().catch(console.error);
