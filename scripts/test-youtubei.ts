import { Innertube } from "youtubei.js";

async function test() {
  const yt = await Innertube.create();
  const explore = await yt.music.getExplore();
  console.log("Explore top buttons:");
  console.dir(
    explore.top_buttons?.map(b => ({
      title: b.text,
      endpoint: b.endpoint?.payload,
    })),
    { depth: null },
  );

  // Can we get new releases directly?
  // Let's see if there's a getNewReleases method?
  console.log(
    "Methods in yt.music:",
    Object.getOwnPropertyNames(Object.getPrototypeOf(yt.music)).filter(
      p => !p.startsWith("_"),
    ),
  );
}

test().catch(console.error);
