import { useNavigate, useParams } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { getShopProduct } from "@/data/shopProducts";
import { ArrowLeft, ShoppingBag } from "lucide-react";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

export default function ShopProduct() {
  const nav = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const product = handle ? getShopProduct(handle) : undefined;

  if (!product) {
    return (
      <MobileShell
        header={
          <header className="px-5 pt-6 safe-top flex items-center gap-3">
            <button onClick={() => nav(-1)} className="size-9 grid place-items-center rounded-full glass press">
              <ArrowLeft className="size-4" />
            </button>
          </header>
        }
      >
        <div className="glass-strong rounded-2xl p-6 text-center mt-8">
          <div className="text-sm font-medium">Product not found</div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      header={
        <header className="px-5 pt-6 safe-top flex items-center gap-3">
          <button onClick={() => nav(-1)} className="size-9 grid place-items-center rounded-full glass press">
            <ArrowLeft className="size-4" />
          </button>
        </header>
      }
    >
      <div className="mt-2 pb-nav">
        <div className="glass rounded-2xl overflow-hidden aspect-square">
          {product.image ? (
            <img src={product.image} alt={product.title} className="size-full object-cover" />
          ) : (
            <div className="size-full grid place-items-center">
              <ShoppingBag className="size-10 text-mint/40" />
            </div>
          )}
        </div>

        <div className="mt-5">
          <h1 className="display text-2xl font-medium">{product.title}</h1>
          <div className="text-lg mint-text font-medium mt-1.5">
            {formatMoney(product.price, product.currency)}
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-foreground/80 leading-relaxed mt-4">{product.description}</p>
        )}

        <button
          onClick={() => nav("/paywall")}
          className="mt-6 w-full mint-fill rounded-xl py-3.5 text-sm font-semibold press"
        >
          Get lifetime access
        </button>
      </div>
    </MobileShell>
  );
}
