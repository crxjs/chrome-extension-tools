module.exports = {
  hooks: {
    readPackages(pkg) {
      if (pkg.name === 'jest-image-snapshot') {
        delete pkg.peerDependencies.jest
        console.log('fixing jest-image-snapshot peer deps')
      }
      return pkg
    },
  },
}
