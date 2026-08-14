// Cloudflare Pages discovers Functions from the repository root for the
// currently connected `temus` project. Keep the implementation next to the
// Adoptan site and expose only this deployment adapter here.
export { onRequest } from "../../../../../site/functions/api/lucia/v1/public/house";
