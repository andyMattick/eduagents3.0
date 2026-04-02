import { handleStudioActiveBlueprint, withStudioErrors } from "../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioActiveBlueprint);