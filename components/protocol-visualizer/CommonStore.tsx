/**
 * \file CommonStore.tsx
 * \brief Shared Zustand store for global UI state across protocol visualizers.
 */

import { create } from 'zustand';

interface CommonStore {
    showDeepDiveOverlay: boolean;
    setShowDeepDiveOverlay: (v: boolean) => void;
}

export const useCommonStore = create<CommonStore>((set) => ({
    showDeepDiveOverlay: false,
    setShowDeepDiveOverlay: (v) => set({ showDeepDiveOverlay: v }),
}));
