import { Box } from "ink";

import LiveStreamsList from "../live-streams/LiveStreamsList.tsx";
import NowPlaying from "../player/NowPlaying.tsx";
import PlayerControls from "../player/PlayerControls.tsx";

export default function LiveStreamsLayout() {
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
    >
      <NowPlaying />
      <PlayerControls />
      <LiveStreamsList />
    </Box>
  );
}
