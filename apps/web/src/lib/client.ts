import { MíngZhànClient } from "@mingzhan/client";
import { formatClientError } from "@mingzhan/core/api-error";

export const client = new MíngZhànClient({ baseUrl: "" });

export { formatClientError as formatError };
