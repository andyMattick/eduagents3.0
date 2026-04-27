import { handleStudioSessionOutputs, withStudioErrors } from "../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioSessionOutputs);