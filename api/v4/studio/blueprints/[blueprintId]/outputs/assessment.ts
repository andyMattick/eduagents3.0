import { handleStudioAssessmentOutput, withStudioErrors } from "../../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioAssessmentOutput);