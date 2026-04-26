import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { createPaymentOrder, verifyPayment } from "../../api/paymentApi";
import ScreenLoader from "../../components/ScreenLoader";
import { readStoredSession } from "../../utils/authRouting";
import { loadRazorpayScript } from "../../utils/loadRazorpay";
import { revealContainer, revealItem } from "./animations";

const paidPlanLabels = {
  recruiter_starter: "Recruiter Starter Plan",
  recruiter_pro: "Recruiter Pro Plan",
};

export default function PricingSection({ pricingPlans }) {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const autoStartedRef = useRef(false);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [paymentMessage, setPaymentMessage] = useState(null);

  const startPayment = useCallback(
    async (plan) => {
      const { token, user } = readStoredSession();

      if (!token || !user) {
        localStorage.setItem("talentx_selected_plan", plan);
        navigate(`/login?selectedPlan=${encodeURIComponent(plan)}`);
        return;
      }

      if (user.role !== "recruiter") {
        setPaymentMessage({
          type: "error",
          text: "Please sign in with a recruiter account to activate a paid plan.",
        });
        return;
      }

      try {
        setLoadingPlan(plan);
        setPaymentMessage(null);

        const order = await createPaymentOrder(plan);
        const razorpayLoaded = await loadRazorpayScript();

        if (!razorpayLoaded) {
          setPaymentMessage({
            type: "error",
            text: "Razorpay SDK failed to load. Please check your internet connection.",
          });
          return;
        }

        const options = {
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: "TalentX",
          description: paidPlanLabels[plan] || "TalentX Recruiter Plan",
          order_id: order.orderId,
          prefill: {
            name: user.name || "TalentX Recruiter",
            email: user.email || "",
          },
          theme: {
            color: "#243b95",
          },
          modal: {
            ondismiss: function () {
              setPaymentMessage({ type: "cancelled", text: "Payment cancelled." });
            },
          },
          handler: async function (response) {
            try {
              setLoadingPlan(plan);
              setPaymentMessage({ type: "loading", text: "Verifying payment..." });
              await verifyPayment({
                ...response,
                plan,
              });
              localStorage.removeItem("talentx_selected_plan");
              setPaymentMessage({ type: "success", text: "Payment verified successfully." });
              navigate("/billing/success");
            } catch (err) {
              setPaymentMessage({
                type: "error",
                text:
                  err.response?.data?.message ||
                  "Payment verification failed. Please contact support.",
              });
            } finally {
              setLoadingPlan("");
            }
          },
        };

        const checkout = new window.Razorpay(options);
        if (typeof checkout.on === "function") {
          checkout.on("payment.failed", function (response) {
            setPaymentMessage({
              type: "error",
              text: response.error?.description || "Payment failed. Please try again.",
            });
          });
        }
        checkout.open();
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
          localStorage.setItem("talentx_selected_plan", plan);
          navigate(`/login?selectedPlan=${encodeURIComponent(plan)}`);
          return;
        }

        setPaymentMessage({
          type: "error",
          text: err.response?.data?.message || "Could not start payment. Please try again.",
        });
      } finally {
        setLoadingPlan("");
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (autoStartedRef.current) return;

    const params = new URLSearchParams(location.search);
    const selectedPlan = params.get("selectedPlan") || localStorage.getItem("talentx_selected_plan");

    if (!["recruiter_starter", "recruiter_pro"].includes(selectedPlan)) return;

    const { token, user } = readStoredSession();
    if (!token || user?.role !== "recruiter") return;

    autoStartedRef.current = true;
    const timer = window.setTimeout(() => {
      startPayment(selectedPlan);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [location.search, startPayment]);

  const handleContactSales = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.section
      id="pricing"
      aria-label="Pricing"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.08 }}
      variants={revealContainer}
    >
      {loadingPlan && (
        <ScreenLoader
          fullScreen
          showBrand
          message={
            paymentMessage?.type === "loading"
              ? "Verifying payment..."
              : "Preparing secure checkout..."
          }
          subtext={
            paymentMessage?.type === "loading"
              ? "Please wait while TalentX confirms your payment."
              : "Opening Razorpay Test Mode checkout."
          }
        />
      )}
      <div className="mx-auto max-w-7xl">
        <motion.div variants={revealItem} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 sm:text-sm">
            PRICING
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl lg:text-4xl">
            Simple plans for every hiring workflow
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:mt-4 sm:text-base lg:text-lg">
            Start free as a student or upgrade recruiter access when your hiring pipeline grows.
          </p>
        </motion.div>

        {paymentMessage && (
          <motion.div
            variants={revealItem}
            className={`mx-auto mt-6 max-w-2xl rounded-2xl border px-4 py-3 text-sm font-semibold sm:px-5 ${
              paymentMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : paymentMessage.type === "cancelled"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : paymentMessage.type === "loading"
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
            role="status"
          >
            {paymentMessage.text}
          </motion.div>
        )}

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 lg:mt-14 xl:grid-cols-4">
          {pricingPlans.map((plan) => (
            <motion.article
              key={plan.key}
              variants={revealItem}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`relative flex min-h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 sm:rounded-[1.5rem] sm:p-6 ${
                plan.highlighted
                  ? "border-[#243b95] shadow-xl shadow-indigo-100/70"
                  : "border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute right-4 top-4 rounded-full bg-[#243b95] px-3 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              )}

              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.highlighted ? "bg-indigo-50 text-[#243b95]" : "bg-slate-100 text-slate-600"
                }`}
              >
                {plan.badge}
              </span>

              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">{plan.name}</h3>
              <div className="mt-4 flex items-end gap-2">
                <p className="text-3xl font-black tracking-tight text-slate-950">{plan.price}</p>
                <p className="pb-1 text-sm font-semibold text-slate-400">{plan.billingText}</p>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <CheckCircleRoundedIcon
                      className="mt-0.5 shrink-0 text-emerald-500"
                      sx={{ fontSize: 18 }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <PlanButton
                plan={plan}
                loadingPlan={loadingPlan}
                onPayment={startPayment}
                onContact={handleContactSales}
              />
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function PlanButton({ plan, loadingPlan, onPayment, onContact }) {
  const className = `mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all duration-200 ${
    plan.highlighted
      ? "bg-[#243b95] text-white hover:bg-[#1d2f80] hover:shadow-lg hover:shadow-[#243b95]/20"
      : "bg-slate-900 text-white hover:bg-slate-700"
  } disabled:cursor-not-allowed disabled:opacity-70`;

  if (plan.action === "signup") {
    return (
      <Link to="/register" className={className}>
        {plan.cta}
        <ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} />
      </Link>
    );
  }

  if (plan.action === "contact") {
    return (
      <button type="button" onClick={onContact} className={className}>
        {plan.cta}
        <ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} />
      </button>
    );
  }

  const isLoading = loadingPlan === plan.key;

  return (
    <button
      type="button"
      onClick={() => onPayment(plan.key)}
      disabled={Boolean(loadingPlan)}
      className={className}
    >
      {isLoading ? "Opening Checkout..." : plan.cta}
      {!isLoading && <ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} />}
    </button>
  );
}
