export default {
  spec_dir: "spec",
  spec_files: [
    "**/*[sS]pec.?(m)js",
    "**/*[sS]pec.ts"
  ],
  helpers: [
    "helpers/**/*.?(m)js",
    "helpers/**/*.ts"
  ],
  requires: [
    "ts-node/register"
  ],
  env: {
    stopSpecOnExpectationFailure: false,
    random: true,
    forbidDuplicateNames: true
  }
}
