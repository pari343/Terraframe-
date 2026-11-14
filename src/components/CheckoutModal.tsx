import React, {useEffect, useMemo, useState} from 'react';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Globe,
  Lock,
  Minus,
  Plus,
  QrCode,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {resolvePhotoUrl} from '../data/seedAssets';
import {
  CartItem,
  CurrencyCode,
  OrderRecord,
  TravelPhoto,
} from '../types/photography';
import {
  convertFromInr,
  CURRENCIES,
  formatConvertedFromInr,
  formatCurrency,
  getTierPriceInr,
  LICENSE_TIERS,
} from '../utils/currency';
import {exportLicenseInvoice} from '../utils/metadataExport';

interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  photos: TravelPhoto[];
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onChangeCurrency: (c: CurrencyCode) => void;
  onUpdateQty: (photoId: string, tier: CartItem['tier'], delta: number) => void;
  onRemoveItem: (photoId: string, tier: CartItem['tier']) => void;
  onClearCart: () => void;
  onOrderComplete: (order: OrderRecord) => void;
  onClose: () => void;
}

type PaymentMethod = 'upi' | 'netbanking' | 'card_inr' | 'card_intl';

interface CreatedIntent {
  intentId: string;
  signature: string;
  currency: CurrencyCode;
  fxRateUsed: number;
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
  totalDisplay: number;
  upiUri: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  photos,
  currency,
  rates,
  onChangeCurrency,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderComplete,
  onClose,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    currency === 'INR' ? 'upi' : 'card_intl'
  );
  const [buyerName, setBuyerName] = useState('Ananya Kaushik');
  const [buyerEmail, setBuyerEmail] = useState('ananyakaushik97620@gmail.com');
  const [upiId, setUpiId] = useState('ananya.kaushik@okicici');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('842');

  const [step, setStep] = useState<'cart' | 'verify' | 'receipt'>('cart');
  const [intent, setIntent] = useState<CreatedIntent | null>(null);
  const [receipt, setReceipt] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && step === 'receipt' && cart.length > 0) {
      setStep('cart');
      setReceipt(null);
      setIntent(null);
    }
  }, [isOpen, cart.length, step]);

  useEffect(() => {
    if (currency === 'INR' && paymentMethod === 'card_intl') {
      setPaymentMethod('upi');
    }
  }, [currency, paymentMethod]);

  const enrichedCart = useMemo(() => {
    return cart
      .map((item) => {
        const photo = photos.find((p) => p.id === item.photoId);
        if (!photo) return null;
        const unitInr = getTierPriceInr(photo.basePriceInr, item.tier);
        return {
          ...item,
          photo,
          unitInr,
          lineInr: unitInr * item.quantity,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, photos]);

  const subtotalInr = enrichedCart.reduce((acc, item) => acc + item.lineInr, 0);
  const isInrRail = paymentMethod !== 'card_intl';
  const gstInr = isInrRail ? Math.round(subtotalInr * 0.18) : 0;
  const totalInr = subtotalInr + gstInr;
  const displayCurrency: CurrencyCode = isInrRail ? 'INR' : currency;

  if (!isOpen) return null;

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enrichedCart.length === 0) return;

    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      setError('Enter a valid UPI ID (e.g. name@okicici or mobile@ybl).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout/create-intent', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          items: cart,
          currency: displayCurrency,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not initialize payment.');
      setIntent(data as CreatedIntent);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!intent) return;
    setLoading(true);
    setError(null);

    try {
      const last4 = cardNumber.replace(/\D/g, '').slice(-4) || '4242';
      const res = await fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          intentId: intent.intentId,
          signature: intent.signature,
          buyerName,
          buyerEmail,
          paymentMethod,
          upiId,
          bankName,
          cardLast4: last4,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment verification failed.');

      const order = data.order as OrderRecord;
      setReceipt(order);
      setStep('receipt');
      onClearCart();
      onOrderComplete(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm payment.');
    } finally {
      setLoading(false);
    }
  };

  const triggerPhotoDownload = (photoId: string, title: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    const url = resolvePhotoUrl(photo);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-master.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Multi-Currency Licensing Checkout"
    >
      <div className="w-full max-w-4xl bg-black text-white rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-zinc-300" />
            <div>
              <h2 className="font-serif text-lg font-semibold text-white">
                {step === 'receipt'
                  ? 'Verified License & Payment Receipt'
                  : 'Terraframe Escrow Checkout'}
              </h2>
              <p className="text-xs text-zinc-400">
                Indian Rupee (UPI / NetBanking / RuPay) &amp; International Multi-Currency Settlement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-9 h-9 rounded-lg hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200 font-medium">
              {error}
            </div>
          )}

          {step === 'receipt' && receipt ? (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-emerald-950/50 border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Order {receipt.orderId} Confirmed
                    </h3>
                    <p className="text-xs text-emerald-300 mt-0.5 font-mono tabular-nums">
                      Ref: {receipt.paymentReference} · Paid{' '}
                      {formatCurrency(receipt.totalDisplay, receipt.currency)} (₹
                      {receipt.totalInr.toLocaleString('en-IN')})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => exportLicenseInvoice(receipt)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download GST Invoice &amp; License</span>
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400">
                  Unlocked High-Resolution Deliverables
                </h4>
                {receipt.items.map((item) => (
                  <div
                    key={`${item.photoId}-${item.licenseCode}`}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {item.tierLabel} · Key:{' '}
                        <span className="font-mono text-white">
                          {item.licenseCode}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        triggerPhotoDownload(item.photoId, item.title)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Master</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : step === 'verify' && intent ? (
            <div className="max-w-lg mx-auto py-4 space-y-5">
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
                {paymentMethod === 'upi' ? (
                  <>
                    <div className="w-32 h-32 mx-auto bg-white p-3 rounded-xl border border-zinc-700 flex flex-col items-center justify-center">
                      <QrCode className="w-20 h-20 text-black" />
                    </div>
                    <p className="text-xs font-mono text-zinc-400">
                      UPI Intent: terraframe.escrow@icici
                    </p>
                    <h3 className="text-base font-semibold text-white">
                      Approve ₹{intent.totalInr.toLocaleString('en-IN')} on {upiId}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Click confirm below once approved in Google Pay, PhonePe, or BHIM.
                    </p>
                  </>
                ) : (
                  <>
                    <ShieldVerifyHeader
                      method={paymentMethod}
                      amountLabel={formatCurrency(
                        intent.totalDisplay,
                        intent.currency
                      )}
                      inrLabel={`₹${intent.totalInr.toLocaleString('en-IN')}`}
                    />
                  </>
                )}

                <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between font-mono tabular-nums">
                  <span>Intent {intent.intentId}</span>
                  <span className="text-white">
                    {formatCurrency(intent.totalDisplay, intent.currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-2.5 rounded-lg border border-zinc-700 text-xs font-semibold text-white hover:bg-zinc-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmPayment}
                  className="flex-1 py-2.5 px-5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? 'Verifying Cryptographic Signature...'
                    : `Authorize & Complete Payment (${formatCurrency(
                        intent.totalDisplay,
                        intent.currency
                      )})`}
                </button>
              </div>
            </div>
          ) : enrichedCart.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-serif text-xl text-white">
                Your licensing bag is empty.
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                Select any photograph in the Atlas or Gallery to license digital masters or archival prints.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleInitiatePayment}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left: Cart Items & Currency Switch */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Selected Works ({enrichedCart.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    <select
                      value={currency}
                      onChange={(e) =>
                        onChangeCurrency(e.target.value as CurrencyCode)
                      }
                      aria-label="Checkout display currency"
                      className="text-xs font-mono font-medium border border-zinc-800 rounded-lg px-2 py-1 bg-zinc-950 text-white focus:border-white focus:outline-none"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-black text-white">
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-zinc-800 border border-zinc-800 bg-zinc-950 rounded-xl">
                  {enrichedCart.map((item) => (
                    <div
                      key={`${item.photoId}-${item.tier}`}
                      className="p-4 flex items-center gap-4"
                    >
                      <img
                        src={resolvePhotoUrl(item.photo)}
                        alt={item.photo.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-lg object-cover shrink-0 border border-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {item.photo.title}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {LICENSE_TIERS[item.tier].label} · {item.photo.photographer}
                        </p>
                        <p className="text-xs font-mono text-white tabular-nums mt-1">
                          {formatConvertedFromInr(item.lineInr, currency, rates)}{' '}
                          <span className="text-zinc-500">
                            (₹{item.lineInr.toLocaleString('en-IN')})
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty(item.photoId, item.tier, -1)
                          }
                          aria-label="Decrease quantity"
                          className="w-7 h-7 rounded border border-zinc-700 flex items-center justify-center hover:bg-zinc-900 text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono tabular-nums text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty(item.photoId, item.tier, 1)
                          }
                          aria-label="Increase quantity"
                          className="w-7 h-7 rounded border border-zinc-700 flex items-center justify-center hover:bg-zinc-900 text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveItem(item.photoId, item.tier)
                          }
                          aria-label="Remove item"
                          className="w-7 h-7 rounded text-zinc-500 hover:text-rose-400 flex items-center justify-center cursor-pointer ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Buyer Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-200 mb-1">
                      Licensee Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-200 mb-1">
                      Invoice &amp; Master Delivery Email
                    </label>
                    <input
                      type="email"
                      required
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right: Payment Gateway Rail Selection */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <p className="text-xs font-semibold text-white">
                    Payment Gateway Rail
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        paymentMethod === 'upi'
                          ? 'bg-white border-white text-black font-semibold'
                          : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 mb-1" />
                      UPI (INR ₹)
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        paymentMethod === 'netbanking'
                          ? 'bg-white border-white text-black font-semibold'
                          : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4 mb-1" />
                      NetBanking (INR)
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card_inr')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        paymentMethod === 'card_inr'
                          ? 'bg-white border-white text-black font-semibold'
                          : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-1" />
                      RuPay / IN Card
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card_intl')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        paymentMethod === 'card_intl'
                          ? 'bg-white border-white text-black font-semibold'
                          : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <Globe className="w-4 h-4 mb-1" />
                      Intl Card ({currency})
                    </button>
                  </div>

                  {paymentMethod === 'upi' && (
                    <div className="pt-2 space-y-2">
                      <label className="block text-[11px] text-zinc-400">
                        UPI ID (GPay, PhonePe, Paytm, BHIM)
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="username@okicici"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-800 bg-black text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div className="pt-2">
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Select Indian Bank
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-800 bg-black text-white focus:border-white focus:outline-none"
                      >
                        <option value="HDFC Bank">HDFC Bank Retail</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}

                  {(paymentMethod === 'card_inr' ||
                    paymentMethod === 'card_intl') && (
                    <div className="pt-2 space-y-2">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        aria-label="Card number"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-800 bg-black text-white focus:border-white focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          aria-label="Card expiry"
                          className="px-3 py-2 text-xs font-mono rounded-lg border border-zinc-800 bg-black text-white focus:border-white focus:outline-none"
                        />
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          aria-label="Card CVV"
                          className="px-3 py-2 text-xs font-mono rounded-lg border border-zinc-800 bg-black text-white focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Settlement Breakdown */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal (INR Base)</span>
                    <span className="font-mono tabular-nums text-white">
                      ₹{subtotalInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>
                      {isInrRail
                        ? 'GST (18% Domestic)'
                        : 'Export Tax (Zero-Rated Intl)'}
                    </span>
                    <span className="font-mono tabular-nums text-white">
                      ₹{gstInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between font-semibold text-sm text-white">
                    <span>Total Due ({displayCurrency})</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(
                        convertFromInr(totalInr, displayCurrency, rates),
                        displayCurrency
                      )}
                    </span>
                  </div>
                  {displayCurrency !== 'INR' && (
                    <p className="text-[11px] font-mono text-zinc-400 tabular-nums text-right">
                      1 INR = {rates[displayCurrency]} {displayCurrency} · Settles ₹
                      {totalInr.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-lg bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? 'Securing Payment Session...'
                    : `Continue to Pay ${formatCurrency(
                        convertFromInr(totalInr, displayCurrency, rates),
                        displayCurrency
                      )}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const ShieldVerifyHeader: React.FC<{
  method: PaymentMethod;
  amountLabel: string;
  inrLabel: string;
}> = ({method, amountLabel, inrLabel}) => (
  <div className="space-y-2">
    <p className="text-xs font-mono text-zinc-400 uppercase">
      {method === 'netbanking'
        ? 'NPCI NetBanking Verification'
        : '3D Secure Gateway Authorization'}
    </p>
    <h3 className="text-lg font-semibold text-white font-mono tabular-nums">
      {amountLabel}
    </h3>
    <p className="text-xs text-zinc-400">
      Escrow settlement equivalent: {inrLabel} INR (85% routed to photographer)
    </p>
  </div>
);
