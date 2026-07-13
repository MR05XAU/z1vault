/**
 * Static copy of the Z1 INSIGHTS Shopify catalog. This is a snapshot, not a
 * live connection — no Shopify API calls or credentials are involved. Update
 * this file by hand when the store's products/pricing/copy change.
 */
export interface ShopProduct {
  handle: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  description: string;
}

export const shopProducts: ShopProduct[] = [
  {
    handle: "z1-insights",
    title: "Z1 INSIGHTS",
    price: 199.99,
    currency: "GBP",
    image:
      "https://cdn.shopify.com/s/files/1/1007/0330/6054/files/3DRENDER_1220df83-dcbd-4e48-816a-1e597c77d41e.png?v=1780942465",
    description: "A guide to everything about trading.",
  },
];

export function getShopProduct(handle: string): ShopProduct | undefined {
  return shopProducts.find((p) => p.handle === handle);
}
