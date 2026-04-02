import { handleStudioBlueprintVersion, withStudioErrors } from "../../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioBlueprintVersion);