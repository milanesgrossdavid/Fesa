const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withAndroidProguard(config) {
  return withGradleProperties(config, (config) => {
    const properties = config.modResults;
    const minifyProperty = properties.find(
      (property) =>
        property.type === "property" &&
        property.key === "android.enableMinifyInReleaseBuilds",
    );

    if (minifyProperty) {
      minifyProperty.value = "true";
    } else {
      properties.push({
        type: "property",
        key: "android.enableMinifyInReleaseBuilds",
        value: "true",
      });
    }

    return config;
  });
};
