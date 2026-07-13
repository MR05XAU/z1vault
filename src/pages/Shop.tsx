import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { shopProducts, type ShopProduct } from "@/data/shopProducts";
import { ArrowLeft, ShoppingBag } from "lucide-react";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

export default function Shop() {
  const nav = useNavigate();

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="flex items-center gap-3">
            <button onClick={() => nav(-1)} className="size-9 grid place-items-center rounded-full glass press">
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Store</div>
              <h1 className="display text-2xl font-medium">Shop.</h1>
            </div>
          </div>
        </header>
      }
    >
      <div className="mt-4 pb-nav">
        <div className="grid grid-cols-2 gap-3">
          {shopProducts.map((p, i) => (
            <ProductCard key={p.handle} product={p} delay={i * 60} onClick={() => nav(`/shop/${p.handle}`)} />
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

function ProductCard({ product, delay, onClick }: { product: ShopProduct; delay: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass rounded-2xl overflow-hidden text-left press hover:shadow-glow animate-fade-up flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="aspect-square bg-surface-elevated overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.title} className="size-full object-cover" />
        ) : (
          <div className="size-full grid place-items-center">
            <ShoppingBag className="size-8 text-gold/40" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-medium line-clamp-2">{product.title}</div>
        <div className="text-xs gold-text font-medium mt-1">{formatMoney(product.price, product.currency)}</div>
      </div>
    </button>
  );
}
