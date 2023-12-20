module.exports = {
  transform: {
    "^.+\\.tsx?$": "babel-jest"
  },
  transformIgnorePatterns: ["node_modules/(?!got).+\\.(j|t)s$"]
};
