"use client";
// Client-side bag. Persists in localStorage. Checkout hands the bag to
// WooCommerce: {WP_URL}/?anashion_cart=ID:QTY[:SIZE],... (handled by the
// anashion-headless plugin, which fills the WC cart and redirects to checkout).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  key: string; // id + size
  id: number;
  name: string;
  price: number;
  image?: string;
  size?: string;
  qty: number;
};

type AddInput = Omit<CartItem, "key" | "qty"> & { qty?: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: AddInput | AddInput[], opts?: { silent?: boolean; message?: string }) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  checkoutUrl: string | null;
  toast: string | null;
  notify: (message: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "anashion-bag-v1";

export function CartProvider({
  children,
  checkoutBase,
}: {
  children: ReactNode;
  checkoutBase: string | null;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (localStorage is unavailable during SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* storage blocked: start empty */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((message: string) => setToast(message), []);

  const add = useCallback<CartContextValue["add"]>((input, opts) => {
    const list = Array.isArray(input) ? input : [input];
    setItems((prev) => {
      const next = [...prev];
      for (const it of list) {
        const key = `${it.id}:${it.size ?? ""}:${it.name}`; // name carries the colour
        const found = next.find((x) => x.key === key);
        if (found) found.qty += it.qty ?? 1;
        else next.push({ ...it, key, qty: it.qty ?? 1 });
      }
      return next.map((x) => ({ ...x }));
    });
    setToast(
      opts?.message ??
        (list.length > 1 ? `${list.length} pieces added to your bag` : `${list[0].name} added to your bag`),
    );
    if (!opts?.silent) setOpen(false);
  }, []);

  const remove = useCallback((key: string) => setItems((p) => p.filter((x) => x.key !== key)), []);
  const setQty = useCallback(
    (key: string, qty: number) =>
      setItems((p) =>
        qty <= 0 ? p.filter((x) => x.key !== key) : p.map((x) => (x.key === key ? { ...x, qty } : x)),
      ),
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, x) => n + x.qty, 0);
    const subtotal = items.reduce((n, x) => n + x.qty * x.price, 0);
    const checkoutUrl =
      checkoutBase && items.length
        ? `${checkoutBase}/?anashion_cart=${encodeURIComponent(
            items
              .map((x) => [x.id, x.qty, ...(x.size ? [encodeURIComponent(x.size)] : [])].join(":"))
              .join(","),
          )}`
        : null;
    return { items, count, subtotal, open, setOpen, add, remove, setQty, checkoutUrl, toast, notify };
  }, [items, open, add, remove, setQty, checkoutBase, toast, notify]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
