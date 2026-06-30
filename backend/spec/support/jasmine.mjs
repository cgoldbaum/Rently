export default {
  spec_dir: "spec",
  spec_files: ["**/*[sS]pec.mjs"],
  env: {
    stopSpecOnExpectationFailure: false,
    random: true,
    forbidDuplicateNames: true
  }
}
