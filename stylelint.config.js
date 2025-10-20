export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["node_modules/**", "dist/**", "build/**"],
  plugins: ["stylelint-order"],
  rules: {
    "declaration-no-important": null,
    "selector-class-pattern": "^[a-z][a-zA-Z0-9-_]*$",
    "order/properties-alphabetical-order": null,
    "selector-pseudo-class-no-unknown": true,
    "custom-property-empty-line-before": null,
    "color-hex-length": null,
    "color-function-notation": null,
    "no-empty-source": null,
  },
};
