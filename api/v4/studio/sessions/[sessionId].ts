import { handleStudioSession, withStudioErrors } from "../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioSession);