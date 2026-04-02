import { handleStudioSessionBlueprints, withStudioErrors } from "../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioSessionBlueprints);