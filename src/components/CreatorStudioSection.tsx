import React, {useState} from 'react';
import {ArrowUpRight, Check, IndianRupee, Landmark} from 'lucide-react';
import {CurrencyCode, PayoutRecord} from '../types/photography';
import {formatConvertedFromInr} from '../utils/currency';

interface PayoutSummary {
  grossRevenueInr: number;
  platformFeeInr: number;
  netCreatorShareInr: number;
  totalWithdrawnInr: number;
  availableBalanceInr: number;
}

interface CreatorStudioSectionProps {
  summary: PayoutSummary;
  payouts: PayoutRecord[];
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onWithdrawSuccess: () => void;
  onOpenUpload: () => void;
}

export const CreatorStudioSection: React.FC<CreatorStudioSectionProps> = ({
  summary,
  payouts,
  currency,
  rates,
  onWithdrawSuccess,
  onOpenUpload,
}) => {
  const [amountInr, setAmountInr] = useState('5000');
  const [method, setMethod] = useState<'UPI Instant' | 'NEFT Bank Transfer'>(
    'UPI Instant'
  );
  const [destination, setDestination] = useState('creator@okicici');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/payouts/withdraw', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          amountInr: Number(amountInr),
          destination,
          method,
          photographerHandle: '@terraframe.creator',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed.');
      setMessage(
        `INR payout settled (${data.payout.reference}) to ${data.payout.destination}.`
      );
      onWithdrawSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="studio"
      className="py-12 border-t border-zinc-800 bg-black"
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-zinc-400">
              Photographer Escrow &amp; INR Settlement Ledger
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white mt-1">
              Creator Studio &amp; Royalties
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
          >
            <span>List New Photograph</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
            <p className="text-xs text-zinc-400">Gross License Sales</p>
            <p className="text-xl font-mono font-semibold text-white tabular-nums mt-1">
              ₹{summary.grossRevenueInr.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-mono text-zinc-500 tabular-nums mt-0.5">
              ≈ {formatConvertedFromInr(summary.grossRevenueInr, currency, rates)}
            </p>
          </div>
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
            <p className="text-xs text-zinc-400">Net Creator Share (85%)</p>
            <p className="text-xl font-mono font-semibold text-white tabular-nums mt-1">
              ₹{summary.netCreatorShareInr.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              15% platform &amp; escrow fee
            </p>
          </div>
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
            <p className="text-xs text-zinc-400">Settled Payouts</p>
            <p className="text-xl font-mono font-semibold text-white tabular-nums mt-1">
              ₹{summary.totalWithdrawnInr.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Via UPI &amp; NEFT rails
            </p>
          </div>
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
            <p className="text-xs text-zinc-400">Available for INR Payout</p>
            <p className="text-xl font-mono font-semibold text-emerald-400 tabular-nums mt-1">
              ₹{summary.availableBalanceInr.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-mono text-zinc-500 tabular-nums mt-0.5">
              Instant T+0 settlement
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Instant INR Withdrawal Form */}
          <div className="lg:col-span-5 bg-zinc-950 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee className="w-4 h-4 text-zinc-300" />
              <h3 className="text-base font-semibold text-white">
                Withdraw Royalty in Indian Rupees
              </h3>
            </div>

            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Payout Rail
                </label>
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(
                      e.target.value as 'UPI Instant' | 'NEFT Bank Transfer'
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-black text-white"
                >
                  <option value="UPI Instant">UPI Instant (Zero Fee)</option>
                  <option value="NEFT Bank Transfer">
                    NEFT / IMPS Bank Transfer
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  {method === 'UPI Instant'
                    ? 'Beneficiary UPI ID'
                    : 'Bank Account / IFSC'}
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={
                    method === 'UPI Instant'
                      ? 'name@okicici'
                      : 'HDFC 50100•••• / HDFC0000123'
                  }
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-700 bg-black text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Amount (INR ₹)
                </label>
                <input
                  type="number"
                  min={500}
                  step={100}
                  required
                  value={amountInr}
                  onChange={(e) => setAmountInr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-zinc-700 bg-black text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Initiating Payout...' : 'Settle INR Payout'}
              </button>
            </form>
          </div>

          {/* Payout History Table */}
          <div className="lg:col-span-7 bg-zinc-950 rounded-2xl border border-zinc-800 p-6 overflow-x-auto">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-4 h-4 text-zinc-400" />
              <h3 className="text-base font-semibold text-white">
                Recent Settlement Ledger
              </h3>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-2.5 pr-4 font-medium">Reference</th>
                  <th className="py-2.5 pr-4 font-medium">Method</th>
                  <th className="py-2.5 pr-4 font-medium">Destination</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Amount (INR)</th>
                  <th className="py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-mono text-white whitespace-nowrap">
                      {p.reference}
                    </td>
                    <td className="py-3 pr-4 text-zinc-400 whitespace-nowrap">
                      {p.method}
                    </td>
                    <td className="py-3 pr-4 font-mono text-zinc-200 whitespace-nowrap">
                      {p.destination}
                    </td>
                    <td className="py-3 pr-4 font-mono tabular-nums font-semibold text-white text-right whitespace-nowrap">
                      ₹{p.amountInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap font-medium text-emerald-400">
                      Settled
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
