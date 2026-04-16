type EnvSource = Record<string, string | undefined>;
type EnvRequirement = string | string[];

function hasValue(source: EnvSource, key: string) {
  const value = source[key];
  return Boolean(value && value.trim().length > 0);
}

function requirementLabel(requirement: EnvRequirement) {
  if (typeof requirement === "string") {
    return requirement;
  }
  return requirement.join(" | ");
}

function assertRequiredEnvKeys(requiredKeys: EnvRequirement[], source: EnvSource, scope: string) {
  const missing = requiredKeys.filter((requirement) => {
    if (typeof requirement === "string") {
      return !hasValue(source, requirement);
    }
    return !requirement.some((key) => hasValue(source, key));
  });

  if (missing.length === 0) {
    return;
  }

  const missingLabels = missing.map(requirementLabel);
  const message = `Server cannot start (${scope}). Missing environment variables: ${missingLabels.join(", ")}`;
  console.error("Missing required environment variables:", missingLabels.join(", "));
  throw new Error(message);
}

/**
 * Backend startup guard for server runtimes.
 * Tests are excluded so unit tests can mock env dependencies per-suite.
 */
export function assertBackendStartupEnv(requiredKeys: EnvRequirement[], scope: string) {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  assertRequiredEnvKeys(requiredKeys, process.env, scope);
}
