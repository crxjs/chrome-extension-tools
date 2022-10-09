module.exports = {
  hooks: {
    readPackages(pkg) {
      if (pkg.name === 'jest-image-snapshot') {
        delete pkg.peerDependencies.jest
      }
      return pkg
    },
  },
}
