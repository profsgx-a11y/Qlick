// Client-safe dictionary type (no "server-only" import) so client components
// can type the dictionary they receive via context. Structurally identical to
// the `Dictionary` exported from ./config.
import el from "./dictionaries/el.json";

export type Dictionary = typeof el;
