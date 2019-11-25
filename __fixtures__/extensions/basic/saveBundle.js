import { getExtPath } from '../../utils';
import { writeJSON } from 'fs-extra';
export const saveBundle = (filepath = getExtPath('basic-bundle.json')) => {
  return {
    generateBundle(options, bundle) {
      if (!process.env.JEST_WATCH) {
        return writeJSON(filepath, bundle, { spaces: 2 });
      }
    },
  };
};
