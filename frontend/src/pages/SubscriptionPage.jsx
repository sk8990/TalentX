import { useState, useEffect } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { getMySubscription, cancelSubscription } from "../api/subscriptionApi";
import { useConfirmDialog } from "../components/useConfirmDialog";
import { toast } from "react-hot-toast";
import Card from "../components/Card";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  XCircle
} from "lucide-react";
import Button from "../components/Button";

export default function SubscriptionPage() {
  const { refreshSubscription } = useSubscription();
  const { confirm } = useConfirmDialog();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setLoading(true);
      const data = await getMySubscription();
      setSubscription(data);
    } catch {
      toast.error("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    const ok = await confirm({
      title: "Cancel Subscription?",
      message: "Are you sure you want to cancel your plan? You will keep your features until the end of the current billing cycle."
    });

    if (!ok) return;

    try {
      await cancelSubscription();
      toast.success("Subscription cancelled successfully");
      await loadSubscription();
      await refreshSubscription();
    } catch {
      toast.error("Cancellation failed. Please try again.");
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center p-8">Loading subscription...</div>;

  const isActive = subscription?.status === "active" || subscription?.status === "free";
  const isExpired = subscription?.status === "expired" || subscription?.status === "cancelled";

  const isRecruiter = subscription?.ownerRole === "recruiter";
  const isStarter = subscription?.planKey === "recruiter_starter";
  const isPro = subscription?.planKey === "recruiter_pro";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription & Billing</h1>
          <p className="text-slate-500">Manage your plan, features, and billing cycle.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Plan Details Card */}
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Current Plan</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {subscription?.status || "Inactive"}
            </span>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-[#243b95]">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Plan Name</p>
                <p className="text-lg font-bold text-slate-900 capitalize">
                  {subscription?.planKey?.replace("_", " ") || "No Active Plan"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Starts At</p>
                <p className="text-sm font-semibold text-slate-900">
                  {subscription?.startsAt ? new Date(subscription.startsAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Expires At</p>
                <p className="text-sm font-semibold text-slate-900">
                  {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : "No expiry"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions Card */}
        <Card>
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Manage</h2>
          <div className="flex flex-col gap-3">
            {isExpired || subscription?.status === "inactive" ? (
              <Button
                className="w-full flex items-center justify-center gap-2"
                onClick={() => window.location.href = "/#pricing"}
              >
                <ArrowRight size={16} />
                View Packages
              </Button>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                {isRecruiter && isStarter && (
                  <Button
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => window.location.href = "/#pricing"}
                  >
                    <ArrowRight size={16} />
                    Upgrade to Pro Package
                  </Button>
                )}
                {isRecruiter && isPro && (
                  <div className="p-3 mb-1 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                    <p className="text-sm font-semibold text-indigo-700">You are subscribed to the highest package!</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 text-rose-600 hover:bg-rose-50"
                  onClick={handleCancel}
                >
                  <XCircle size={16} />
                  Cancel Subscription
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Features & Limits */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Plan Features & Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(subscription?.features || {}).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
              <span className="text-sm text-slate-600 capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
              {enabled ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <XCircle size={18} className="text-slate-300" />
              )}
            </div>
          ))}

          <div className="col-span-full mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Resource Limits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(subscription?.limits || {}).map(([limit, value]) => (
                <div key={limit} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-sm text-slate-600 capitalize">{limit}</span>
                  <span className="text-sm font-bold text-slate-900">
                    {value === null ? "Unlimited" : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
