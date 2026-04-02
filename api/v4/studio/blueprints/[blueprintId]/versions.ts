import { handleStudioBlueprintVersions, withStudioErrors } from "../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioBlueprintVersions);