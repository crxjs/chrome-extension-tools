| features                  | rollup build | rollup watch | vite build | vite watch                |
| ------------------------- | ------------ | ------------ | ---------- | ------------------------- |
| alt manifest formats      | yes          | yes          | yes        | yes                       |
| auto permissions          | yes          | yes          | yes        | yes                       |
| copy assets               | yes          | yes          | yes        | yes                       |
| parse html for assets     | yes          | yes          | yes        | yes                       |
| parse manifest for assets | yes          | yes          | yes        | yes                       |
| reload background         | n/a          | yes          | n/a        | yes                       |
| reload content script     | n/a          | yes          | n/a        | yes                       |
| reload HTML on change     | n/a          | no, see [1]  | n/a        | mv2: HMR; mv3: no, see[2] |
| reload on asset change    | n/a          | yes          | n/a        | yes                       |
| reload on json change     | n/a          | yes          | n/a        | yes                       |
| reload on manifest change | n/a          | yes          | n/a        | yes                       |
| support react HMR         | n/a          | n/a          | n/a        | mv2: HMR; mv3: no, see[2] |
| support typescript        | yes          | yes          | yes        | yes                       |
| transform html as index   | yes          | yes          | yes        | yes                       |
| validate manifest         | yes          | no, see [3]  | yes        | no, see [3]               |

1. No reloading for HTML pages in Rollup. A new build triggers a
   full reload, which blows away the open page.
2. This Chromium bug blocks use of HMR in MV3 (Please give it a
   star so it gets some attention!):
   https://bugs.chromium.org/p/chromium/issues/detail?id=1247690#c_ts1631117342
3. Currently, an error in watch mode kills the build (just
   restart watch mode).
