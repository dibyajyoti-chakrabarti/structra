import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import loadRazorpayScript from "../utils/loadRazorpayScript";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_PLAN_NAME = "INDIVIDUAL";
const OVERLAY_MIN_DURATION_MS = 3000;
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 5;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePlan = (planName) => (planName || "CORE").toUpperCase();

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error || error?.message || fallback;

export default function useRazorpayCheckout() {
  const navigate = useNavigate();
  const { refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successOverlayMessage, setSuccessOverlayMessage] = useState(
    "Payment Successful. Provisioning your workspace...",
  );

  const pollForPlanUpgrade = useCallback(async (targetPlan) => {
    const normalizedTarget = normalizePlan(targetPlan);

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      try {
        const profileResponse = await api.get("auth/profile/", { cache: false });
        const profilePlan = normalizePlan(profileResponse.data?.current_plan);
        if (profilePlan === normalizedTarget) {
          return true;
        }
      } catch {
        // Best-effort polling. We continue until attempts are exhausted.
      }

      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await wait(POLL_INTERVAL_MS);
      }
    }

    return false;
  }, []);

  const startCheckout = useCallback(
    async (planName = DEFAULT_PLAN_NAME, quantity = 1) => {
      if (isLoading) {
        return {
          status: "failed",
          message: "A checkout session is already in progress.",
        };
      }

      setIsLoading(true);

      try {
        const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!keyId) {
          throw new Error("Razorpay key is missing. Configure VITE_RAZORPAY_KEY_ID.");
        }

        const sdkLoaded = await loadRazorpayScript();
        if (!sdkLoaded || !window.Razorpay) {
          throw new Error("Unable to load Razorpay checkout SDK.");
        }

        const normalizedTargetPlan = normalizePlan(planName);
        const createCheckoutResponse = await api.post("payments/checkout/", {
          plan_name: normalizedTargetPlan,
          quantity,
        });

        const {
          razorpay_subscription_id: razorpaySubscriptionId,
          amount,
          currency,
        } = createCheckoutResponse.data;
        const paiseAmount = Math.round(Number(amount) * 100);

        const result = await new Promise((resolve) => {
          let settled = false;
          const settleOnce = () => {
            if (settled) return false;
            settled = true;
            return true;
          };

          const razorpay = new window.Razorpay({
            key: keyId,
            subscription_id: razorpaySubscriptionId,
            amount: Number.isFinite(paiseAmount) ? paiseAmount : undefined,
            currency,
            name: "Structra",
            description: `${normalizedTargetPlan} Plan`,
            theme: {
              color: "#2563eb",
            },
            handler: async (razorpayResponse) => {
              if (!settleOnce()) return;

              const overlayStartedAt = Date.now();
              setSuccessOverlayMessage("Payment Successful. Provisioning your workspace...");
              setShowSuccessOverlay(true);

              try {
                const verifyPayload = {
                  razorpay_subscription_id:
                    razorpayResponse?.razorpay_subscription_id || razorpaySubscriptionId,
                  razorpay_payment_id: razorpayResponse?.razorpay_payment_id,
                  razorpay_signature: razorpayResponse?.razorpay_signature,
                };

                if (verifyPayload.razorpay_payment_id && verifyPayload.razorpay_signature) {
                  try {
                    await api.post("payments/orders/verify/", verifyPayload);
                  } catch {
                    // Webhook may still finalize the plan; polling below handles eventual consistency.
                  }
                }

                const upgraded = await Promise.all([
                  pollForPlanUpgrade(normalizedTargetPlan),
                  wait(OVERLAY_MIN_DURATION_MS),
                ]).then(([matched]) => matched);

                if (!upgraded) {
                  resolve({
                    status: "failed",
                    message:
                      "Payment received but subscription activation is still pending. Please refresh in a moment.",
                  });
                  return;
                }

                await Promise.allSettled([
                  refreshUserProfile(),
                  api.get("workspaces/", { cache: false }),
                ]);

                resolve({
                  status: "success",
                  message: "Payment successful. Your subscription is being provisioned.",
                });

                navigate("/app");
              } catch (error) {
                resolve({
                  status: "failed",
                  message: getErrorMessage(error, "Unable to finalize payment status."),
                });
              } finally {
                const elapsed = Date.now() - overlayStartedAt;
                if (elapsed < OVERLAY_MIN_DURATION_MS) {
                  await wait(OVERLAY_MIN_DURATION_MS - elapsed);
                }
                setShowSuccessOverlay(false);
                setIsLoading(false);
              }
            },
            modal: {
              ondismiss: () => {
                if (!settleOnce()) return;
                resolve({
                  status: "failed",
                  message: "Payment was cancelled before completion.",
                });
                setShowSuccessOverlay(false);
                setIsLoading(false);
              },
            },
          });

          razorpay.open();
        });

        return result;
      } catch (error) {
        setShowSuccessOverlay(false);
        setIsLoading(false);
        return {
          status: "failed",
          message: getErrorMessage(error, "Unable to start checkout."),
        };
      }
    },
    [isLoading, navigate, pollForPlanUpgrade, refreshUserProfile],
  );

  return {
    startCheckout,
    isLoading,
    showSuccessOverlay,
    successOverlayMessage,
  };
}
