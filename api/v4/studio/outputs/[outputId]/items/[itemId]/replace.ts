import { handleStudioOutputItemReplace, withStudioErrors } from "../../../../shared";

export const runtime = "nodejs";

export default withStudioErrors(handleStudioOutputItemReplace);
