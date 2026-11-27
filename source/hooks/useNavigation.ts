// Navigation hook
import { useNavigation as useNavigationStore } from "../stores/navigation.store.tsx";

export function useNavigation() {
  return useNavigationStore();
}
