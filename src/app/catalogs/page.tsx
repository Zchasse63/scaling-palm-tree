// Backwards-compat redirect. The catalog selector now lives inside `/` and
// only renders when the customer has 2+ active catalogs.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CatalogsRedirect() {
  redirect("/");
}
