// Checks that RLS keeps shops apart: user B must not read or change user A's private data.
// Run against a TEST Supabase project that has migrations 0001-0004 applied, never against production:
//   node --env-file=.env.rls-test scripts/rls-check.mjs
// .env.rls-test needs:
//   SUPABASE_URL, SUPABASE_ANON_KEY            test project (Settings -> API)
//   RLS_A_EMAIL, RLS_A_PASSWORD                 confirmed user, not an admin
//   RLS_B_EMAIL, RLS_B_PASSWORD                 another confirmed user, not an admin
//   RLS_ADMIN_EMAIL, RLS_ADMIN_PASSWORD         optional: a user listed in public.admins
// The script creates one shop per test user (kept for reruns) and deletes the other rows and files it creates.
import { createClient } from "@supabase/supabase-js";

const env = (name, optional = false) => {
  const value = process.env[name];
  if (!value && !optional) {
    console.error(`Missing ${name} (see the header of scripts/rls-check.mjs).`);
    process.exit(2);
  }
  return value;
};

const url = env("SUPABASE_URL");
const anonKey = env("SUPABASE_ANON_KEY");
const newClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(email, password) {
  const supabase = newClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return { supabase, user: data.user };
}

let failures = 0;
async function check(name, fn) {
  try {
    const ok = await fn();
    if (ok === true) return console.log(`  ok    ${name}`);
    failures++;
    console.log(`  FAIL  ${name}${ok === false ? "" : ` (${JSON.stringify(ok)})`}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL  ${name} (threw: ${err instanceof Error ? err.message : err})`);
  }
}

// Runs a query that RLS should block: either it errors or it touches no rows.
const blocked = async (query) => {
  const { data, error } = await query;
  return error ? true : Array.isArray(data) ? data.length === 0 || data : data === null || data;
};
const mustError = async (query) => {
  const { error } = await query;
  return error ? true : "no error";
};
const must = async (query) => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

async function ensureShop({ supabase, user }, label) {
  const existing = await must(supabase.from("clients").select("id, slug").eq("owner_id", user.id).maybeSingle());
  if (existing) return existing;
  const slug = `rls-${label}-${crypto.randomUUID().slice(0, 8)}`;
  return must(supabase.from("clients").insert({ name: `RLS ${label}`, slug, owner_id: user.id }).select("id, slug").single());
}

const a = await signIn(env("RLS_A_EMAIL"), env("RLS_A_PASSWORD"));
const b = await signIn(env("RLS_B_EMAIL"), env("RLS_B_PASSWORD"));
const adminEmail = env("RLS_ADMIN_EMAIL", true);
const admin = adminEmail ? await signIn(adminEmail, env("RLS_ADMIN_PASSWORD")) : null;
const anon = newClient();

const shopA = await ensureShop(a, "a");
const shopB = await ensureShop(b, "b");

// --- Fixtures owned by A ---
const product = await must(a.supabase.from("products").insert({ client_id: shopA.id, name: "RLS product", price: 1000 }).select("id").single());
const post = await must(a.supabase.from("content_posts").insert({ client_id: shopA.id, platform: "facebook", body: "RLS post" }).select("id").single());
await must(
  a.supabase.rpc("save_menu", {
    p_client_id: shopA.id,
    p_title: "RLS menu",
    p_published: false,
    p_categories: [{ name: "RLS", items: [{ name: "Món thử", description: "", price: 10000, options: [], is_available: true }] }],
  }),
);
const menuA = await must(a.supabase.from("menus").select("id, menu_categories(id, menu_items(id, product_id))").eq("client_id", shopA.id).single());
const categoryIdRef = { value: menuA.menu_categories[0].id };
const itemIdRef = { value: menuA.menu_categories[0].menu_items[0].id };
const file = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
const originalPath = `${shopA.id}/products/rls-${crypto.randomUUID()}.jpg`;
const publicPath = `${shopA.id}/products/${product.id}/rls-${crypto.randomUUID()}.jpg`;
await must(a.supabase.storage.from("originals").upload(originalPath, file()));
await must(a.supabase.storage.from("public-assets").upload(publicPath, file()));

console.log("Owner A can manage own shop (sanity: the checks below would be meaningless otherwise)");
await check("A reads own post", async () => (await must(a.supabase.from("content_posts").select("id").eq("id", post.id))).length === 1);
await check("A reads own unpublished menu", async () => (await must(a.supabase.from("menus").select("id").eq("client_id", shopA.id))).length === 1);
await check("A updates own shop", async () => (await must(a.supabase.from("clients").update({ intro: "rls" }).eq("id", shopA.id).select("id"))).length === 1);
await check("A downloads own original", async () => !(await a.supabase.storage.from("originals").download(originalPath)).error);
await check("A can_manage own shop", async () => (await must(a.supabase.rpc("can_manage", { p_client_id: shopA.id }))) === true);
await check("A logs AI usage", async () => !(await a.supabase.from("ai_usage").insert({ client_id: shopA.id, kind: "post" })).error);
await check("A reads own AI usage", async () => (await must(a.supabase.from("ai_usage").select("id").eq("client_id", shopA.id))).length >= 1);
await check("A reads global AI count", async () => (await must(a.supabase.rpc("ai_usage_global_count", { p_since: "2000-01-01T00:00:00Z" }))) >= 1);

console.log("Catalog: menu items link to the shop's own products");
const linkedProductId = menuA.menu_categories[0].menu_items[0].product_id;
await check("save_menu links the item to a product of A", async () => {
  const p = await must(a.supabase.from("products").select("client_id, name, price, is_featured").eq("id", linkedProductId).single());
  return (p.client_id === shopA.id && p.name === "Món thử" && p.price === 10000 && p.is_featured === false) || p;
});
await check("same name in other case reuses the product and syncs the price", async () => {
  await must(
    a.supabase.rpc("save_menu", {
      p_client_id: shopA.id,
      p_title: "RLS menu",
      p_published: false,
      p_categories: [{ name: "RLS", items: [{ name: "MÓN THỬ", description: "", price: 12000, options: [], is_available: true }] }],
    }),
  );
  const items = await must(a.supabase.from("menu_items").select("product_id, menu_categories!inner(menu_id)").eq("menu_categories.menu_id", menuA.id));
  const p = await must(a.supabase.from("products").select("price").eq("id", linkedProductId).single());
  const dupes = await must(a.supabase.from("products").select("id").eq("client_id", shopA.id).ilike("name", "món thử"));
  return (items.length === 1 && items[0].product_id === linkedProductId && p.price === 12000 && dupes.length === 1) || { items, p, dupes };
});
// Restore the fixture the later checks expect (price 10000) and refresh the item id that save_menu replaced.
await must(
  a.supabase.rpc("save_menu", {
    p_client_id: shopA.id,
    p_title: "RLS menu",
    p_published: false,
    p_categories: [{ name: "RLS", items: [{ name: "Món thử", description: "", price: 10000, options: [], is_available: true }] }],
  }),
);
{
  const fresh = await must(a.supabase.from("menus").select("menu_categories(id, menu_items(id))").eq("id", menuA.id).single());
  categoryIdRef.value = fresh.menu_categories[0].id;
  itemIdRef.value = fresh.menu_categories[0].menu_items[0].id;
}
await check("B cannot link own menu item to A's product", async () => {
  await must(
    b.supabase.rpc("save_menu", {
      p_client_id: shopB.id,
      p_title: "B menu",
      p_published: false,
      p_categories: [{ name: "B", items: [{ name: "B item", description: "", price: 1, options: [], is_available: true }] }],
    }),
  );
  const menuB = await must(b.supabase.from("menus").select("id, menu_categories(menu_items(id, product_id))").eq("client_id", shopB.id).single());
  const bItem = menuB.menu_categories[0].menu_items[0];
  const result = await mustError(b.supabase.from("menu_items").update({ product_id: linkedProductId }).eq("id", bItem.id));
  await b.supabase.from("menus").delete().eq("id", menuB.id);
  await b.supabase.from("products").delete().eq("id", bItem.product_id);
  return result;
});

console.log("User B cannot read A's private data");
await check("posts", () => blocked(b.supabase.from("content_posts").select("id").eq("client_id", shopA.id)));
await check("unpublished menu", () => blocked(b.supabase.from("menus").select("id").eq("client_id", shopA.id)));
await check("unpublished menu categories", () => blocked(b.supabase.from("menu_categories").select("id").eq("menu_id", menuA.id)));
await check("unpublished menu items", () => blocked(b.supabase.from("menu_items").select("id").eq("category_id", categoryIdRef.value)));
await check("AI usage", () => blocked(b.supabase.from("ai_usage").select("id").eq("client_id", shopA.id)));
await check("original image download", () => mustError(b.supabase.storage.from("originals").download(originalPath)));
await check("original image signed URL", () => mustError(b.supabase.storage.from("originals").createSignedUrl(originalPath, 60)));
await check("originals folder listing", () => blocked(b.supabase.storage.from("originals").list(`${shopA.id}/products`)));
await check("can_manage(A) is false", async () => (await must(b.supabase.rpc("can_manage", { p_client_id: shopA.id }))) === false);
await check("admin_list_clients", () => mustError(b.supabase.rpc("admin_list_clients")));

console.log("User B cannot change A's data");
await check("update A's shop", () => blocked(b.supabase.from("clients").update({ name: "hacked" }).eq("id", shopA.id).select("id")));
await check("delete A's shop", () => blocked(b.supabase.from("clients").delete().eq("id", shopA.id).select("id")));
await check("update A's product", () => blocked(b.supabase.from("products").update({ name: "hacked" }).eq("id", product.id).select("id")));
await check("delete A's product", () => blocked(b.supabase.from("products").delete().eq("id", product.id).select("id")));
await check("insert product into A", () => mustError(b.supabase.from("products").insert({ client_id: shopA.id, name: "x" })));
await check("move own product into A", async () => {
  const own = await must(b.supabase.from("products").insert({ client_id: shopB.id, name: "B product" }).select("id").single());
  const result = await mustError(b.supabase.from("products").update({ client_id: shopA.id }).eq("id", own.id));
  await b.supabase.from("products").delete().eq("id", own.id);
  return result;
});
await check("insert post into A", () => mustError(b.supabase.from("content_posts").insert({ client_id: shopA.id, platform: "facebook", body: "x" })));
await check("delete A's post", () => blocked(b.supabase.from("content_posts").delete().eq("id", post.id).select("id")));
await check("save_menu on A", () => mustError(b.supabase.rpc("save_menu", { p_client_id: shopA.id, p_title: "x", p_published: true, p_categories: [] })));
await check("insert category into A's menu", () => mustError(b.supabase.from("menu_categories").insert({ menu_id: menuA.id, name: "x" })));
await check("insert item into A's category", () => mustError(b.supabase.from("menu_items").insert({ category_id: categoryIdRef.value, name: "x" })));
await check("update A's menu item", () => blocked(b.supabase.from("menu_items").update({ price: 1 }).eq("id", itemIdRef.value).select("id")));
await check("log AI usage on A", () => mustError(b.supabase.from("ai_usage").insert({ client_id: shopA.id, kind: "post" })));
await check("upload into A's originals", () => mustError(b.supabase.storage.from("originals").upload(`${shopA.id}/products/evil.jpg`, file())));
await check("upload into A's public-assets", () => mustError(b.supabase.storage.from("public-assets").upload(`${shopA.id}/products/evil.jpg`, file())));
await check("overwrite A's public image", () => mustError(b.supabase.storage.from("public-assets").update(publicPath, file())));
await check("upload outside any shop folder", () => mustError(b.supabase.storage.from("public-assets").upload(`not-a-uuid/evil.jpg`, file())));
await check("delete A's public image", async () => {
  await b.supabase.storage.from("public-assets").remove([publicPath]);
  const { data } = await a.supabase.storage.from("public-assets").list(`${shopA.id}/products/${product.id}`);
  return (data ?? []).some((f) => publicPath.endsWith(f.name)) || "file was deleted";
});
await check("A's data intact after B's attempts", async () => {
  const shop = await must(a.supabase.from("clients").select("name").eq("id", shopA.id).single());
  const prod = await must(a.supabase.from("products").select("name").eq("id", product.id).single());
  const item = await must(a.supabase.from("menu_items").select("price").eq("id", itemIdRef.value).single());
  return (shop.name === "RLS a" && prod.name === "RLS product" && item.price === 10000) || { shop, prod, item };
});

console.log("Owners cannot escalate");
await check("B cannot create a second shop", () => mustError(b.supabase.from("clients").insert({ name: "B2", slug: `rls-b2-${Date.now()}`, owner_id: b.user.id })));
await check("B cannot create a shop owned by A", () => mustError(b.supabase.from("clients").insert({ name: "x", slug: `rls-x-${Date.now()}`, owner_id: a.user.id })));
await check("B cannot create an ownerless shop", () => mustError(b.supabase.from("clients").insert({ name: "x", slug: `rls-y-${Date.now()}` })));
await check("B cannot hand own shop to A", () => mustError(b.supabase.from("clients").update({ owner_id: a.user.id }).eq("id", shopB.id)));
await check("B cannot disable/enable own shop", () => mustError(b.supabase.from("clients").update({ is_disabled: true }).eq("id", shopB.id)));
await check("B cannot change own slug", () => mustError(b.supabase.from("clients").update({ slug: `rls-new-${Date.now()}` }).eq("id", shopB.id)));
await check("B cannot make itself admin", () => mustError(b.supabase.from("admins").insert({ user_id: b.user.id })));

console.log("Anonymous visitors");
await check("cannot read posts", () => blocked(anon.from("content_posts").select("id").eq("client_id", shopA.id)));
await check("cannot read unpublished menu", () => blocked(anon.from("menus").select("id").eq("client_id", shopA.id)));
await check("cannot call global AI count", () => mustError(anon.rpc("ai_usage_global_count", { p_since: "2000-01-01T00:00:00Z" })));
await check("can read shop page", async () => (await must(anon.from("clients").select("id").eq("slug", shopA.slug))).length === 1);
await must(a.supabase.from("menus").update({ is_published: true }).eq("id", menuA.id));
await check("can read published menu with items", async () => {
  const menu = await must(anon.from("menus").select("id, menu_categories(id, menu_items(id))").eq("client_id", shopA.id).maybeSingle());
  return menu?.menu_categories?.[0]?.menu_items?.length === 1 || menu;
});

if (admin) {
  console.log("Super admin");
  await check("reads A's post", async () => (await must(admin.supabase.from("content_posts").select("id").eq("id", post.id))).length === 1);
  await check("updates A's shop", async () => (await must(admin.supabase.from("clients").update({ intro: "admin" }).eq("id", shopA.id).select("id"))).length === 1);
  await check("downloads A's original", async () => !(await admin.supabase.storage.from("originals").download(originalPath)).error);
  await check("admin_list_clients shows A's email", async () => {
    const rows = await must(admin.supabase.rpc("admin_list_clients"));
    return rows.find((r) => r.id === shopA.id)?.owner_email === a.user.email || "missing";
  });
  await must(admin.supabase.from("clients").update({ is_disabled: true }).eq("id", shopA.id));
  await check("disabled shop hidden from anon", () => blocked(anon.from("clients").select("id").eq("id", shopA.id)));
  await check("disabled shop's products hidden from anon", () => blocked(anon.from("products").select("id").eq("client_id", shopA.id)));
  await check("disabled shop's menu hidden from anon", () => blocked(anon.from("menus").select("id").eq("client_id", shopA.id)));
  await check("disabled shop's menu items hidden from anon", () => blocked(anon.from("menu_items").select("id").eq("id", itemIdRef.value)));
  await check("owner still sees own disabled shop", async () => (await must(a.supabase.from("clients").select("id").eq("id", shopA.id))).length === 1);
  await check("owner cannot re-enable", () => mustError(a.supabase.from("clients").update({ is_disabled: false }).eq("id", shopA.id)));
  await must(admin.supabase.from("clients").update({ is_disabled: false }).eq("id", shopA.id));
} else {
  console.log("Super admin: skipped (set RLS_ADMIN_EMAIL / RLS_ADMIN_PASSWORD to run)");
}

// --- Cleanup (shops stay so reruns reuse them) ---
await a.supabase.storage.from("originals").remove([originalPath]);
await a.supabase.storage.from("public-assets").remove([publicPath]);
await a.supabase.from("content_posts").delete().eq("id", post.id);
await a.supabase.from("products").delete().eq("id", product.id);
await a.supabase.from("menus").delete().eq("id", menuA.id);
await a.supabase.from("products").delete().eq("id", linkedProductId);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
