// An extremely simple external store
import { writable } from "svelte/store";
export const count = writable(0);
