'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const defineManifest = (manifest) => manifest;
const defineDynamicResource = ({
  matches = ["http://*/*", "https://*/*"],
  use_dynamic_url = true
}) => ({
  matches,
  resources: [DYNAMIC_RESOURCE],
  use_dynamic_url
});
const DYNAMIC_RESOURCE = "<dynamic_resource>";

exports.defineDynamicResource = defineDynamicResource;
exports.defineManifest = defineManifest;
