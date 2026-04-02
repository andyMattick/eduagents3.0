import { handleStudioSessionAnalysis, withStudioErrors } from "../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioSessionAnalysis);