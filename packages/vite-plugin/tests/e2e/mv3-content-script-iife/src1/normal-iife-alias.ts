import { bareIifeAliasScriptId } from './script-ids'
import { createMarker, getMessage } from './utils'

// This file is a normal-named TS (no .iife suffix).
// It is NOT listed in manifest.content_scripts and NOT in standaloneFiles.
// It is only marked as IIFE via the bare `?iife` query string in the import in background.ts.
// This exercises the full "force IIFE via query alias for a dynamic registered content script" edge case.
createMarker(bareIifeAliasScriptId, `bare-iife-alias: ${getMessage()}`)
