// force redeploy
export const config = {
	runtime: "nodejs",
};

import handler from '../../src/pages/api/v4/ingest';

export default handler;