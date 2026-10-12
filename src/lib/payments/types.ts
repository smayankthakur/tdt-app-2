export type CheckoutOptions = {
  key: string;
  amount: number; // paise
  currency: 'INR';
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color: string; backdrop_color?: string };
};

export type CheckoutSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

export type CheckoutResult =
  | { status: 'success'; data: CheckoutSuccess }
  | { status: 'cancelled' }
  | { status: 'failed'; message?: string };
