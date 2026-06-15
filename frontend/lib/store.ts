"use client";

import { create } from "zustand";

export type Staff = {
  id: string;
  name?: string;
  email?: string;
  role?: "staff" | "admin" | string;
};

type AppState = {
  authToken: string | null;
  staff: Staff | null;
  rfidAuthenticated: boolean;
  webSocketConnected: boolean;

  setAuth: (token: string, staff: Staff) => void;
  setRFIDAuthenticated: (value: boolean) => void;
  setCurrentStaff: (staff: Staff | null) => void;
  setWebSocketConnected: (value: boolean) => void;
};

export const useApp = create<AppState>((set) => ({
  authToken: null,
  staff: null,
  rfidAuthenticated: false,
  webSocketConnected: false,

  setAuth: (token, staff) =>
    set({ authToken: token, staff, rfidAuthenticated: true }),

  setRFIDAuthenticated: (value) => set({ rfidAuthenticated: value }),
  setCurrentStaff: (staff) => set({ staff }),
  setWebSocketConnected: (value) => set({ webSocketConnected: value }),
}));

// Backwards-compatible alias (some pages use useAuth)
export const useAuth = useApp;

