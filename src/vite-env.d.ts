/// <reference types="vite/client" />

import type { PetPetAPI } from "../electron/preload";

declare global {
  interface Window {
    petpet: PetPetAPI;
  }
}
