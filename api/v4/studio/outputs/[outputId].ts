import { handleStudioOutput, withStudioErrors } from "../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioOutput);