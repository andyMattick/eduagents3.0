import { handleStudioBlueprint, withStudioErrors } from "../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioBlueprint);