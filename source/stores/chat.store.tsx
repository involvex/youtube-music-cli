// Chat store for LLM conversations
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import { usePlayer } from "../hooks/usePlayer.ts";
import { getConfigService } from "../services/config/config.service.ts";
import { getLLMService } from "../services/llm/llm.service.ts";
import { type ToolExecutorContext } from "../services/llm/tool-executor.ts";
import type { ChatMessage } from "../types/llm.types.ts";
import type { Track } from "../types/youtube-music.types.ts";

type ChatAction =
  | { category: "SET_MESSAGES"; messages: ChatMessage[] }
  | { category: "ADD_USER_MESSAGE"; content: string }
  | { category: "ADD_ASSISTANT_MESSAGE"; content: string }
  | { category: "SET_PROCESSING"; isProcessing: boolean }
  | { category: "SET_ERROR"; error: string | null }
  | { category: "CLEAR_CHAT" };

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  error: string | null;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.category) {
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
    case "ADD_USER_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: "user",
            content: action.content,
            timestamp: Date.now(),
          },
        ],
      };
    case "ADD_ASSISTANT_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: "assistant",
            content: action.content,
            timestamp: Date.now(),
          },
        ],
      };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.isProcessing };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "CLEAR_CHAT":
      return { ...state, messages: [], error: null };
    default:
      return state;
  }
}

interface ChatContextValue {
  messages: ChatMessage[];
  isProcessing: boolean;
  error: string | null;
  sendMessage: (prompt: string) => Promise<void>;
  clearChat: () => void;
  isConfigured: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isProcessing: false,
    error: null,
  });

  const configService = getConfigService();
  const configServiceRef = useRef(configService);
  const llmService = getLLMService();
  const { state: playerState, dispatch: playerDispatch } = usePlayer();

  useEffect(() => {
    const savedHistory = configServiceRef.current.get("llmChatHistory");
    if (savedHistory && savedHistory.length > 0) {
      dispatch({ category: "SET_MESSAGES", messages: savedHistory });
    }
  }, []);

  useEffect(() => {
    configServiceRef.current.set("llmChatHistory", state.messages);
  }, [state.messages]);

  const isConfigured = llmService.isConfigured();

  const sendMessage = async (prompt: string): Promise<void> => {
    dispatch({ category: "ADD_USER_MESSAGE", content: prompt });
    dispatch({ category: "SET_PROCESSING", isProcessing: true });
    dispatch({ category: "SET_ERROR", error: null });

    try {
      const context = {
        currentTrack: playerState.currentTrack?.title ?? "",
        queueLength: playerState.queue.length,
        playlists: (configServiceRef.current.get("playlists") ?? []).map(
          (p: { playlistId: string; name: string }) => ({
            playlistId: p.playlistId,
            name: p.name,
          }),
        ),
      };

      const toolContext: ToolExecutorContext = {
        addToQueue: (tracks: Track[]) => {
          tracks.forEach(t => {
            playerDispatch({ category: "ADD_TO_QUEUE", track: t });
          });
        },
        playTracks: (tracks: Track[]) => {
          if (tracks.length > 0) {
            playerDispatch({ category: "SET_QUEUE", queue: tracks });
            playerDispatch({ category: "PLAY", track: tracks[0]! });
          }
        },
        createPlaylist: (name: string, tracks: Track[]): string | null => {
          const currentPlaylists =
            configServiceRef.current.get("playlists") || [];
          const newPlaylist = {
            playlistId: `ai-${Date.now()}`,
            name,
            tracks,
          };
          currentPlaylists.push(newPlaylist);
          configServiceRef.current.set("playlists", currentPlaylists);
          return newPlaylist.playlistId;
        },
        getQueue: () => playerState.queue,
      };

      const response = await llmService.chat(
        prompt,
        context,
        state.messages,
        toolContext,
      );
      dispatch({ category: "ADD_ASSISTANT_MESSAGE", content: response.text });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      dispatch({ category: "SET_ERROR", error: message });
    } finally {
      dispatch({ category: "SET_PROCESSING", isProcessing: false });
    }
  };

  const clearChat = (): void => {
    dispatch({ category: "CLEAR_CHAT" });
  };

  return (
    <ChatContext.Provider
      value={{
        messages: state.messages,
        isProcessing: state.isProcessing,
        error: state.error,
        sendMessage,
        clearChat,
        isConfigured,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

export { ChatProvider, useChat };
