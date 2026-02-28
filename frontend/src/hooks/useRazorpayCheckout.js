import { useCallback, useState } from "react";
import api from "../api";
import loadRazorpayScript from "../utils/loadRazorpayScript";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_PLAN_NAME = "INDIVIDUAL";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error || error?.message || fallback;

export default function useRazorpayCheckout() {
  const { updateUserPlan } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = useCallback(async (planName = DEFAULT_PLAN_NAME) => {
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

      const createOrderResponse = await api.post("payments/orders/create/", {
        plan_name: planName,
      });

      const { razorpay_order_id: razorpayOrderId, amount, currency } = createOrderResponse.data;
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
          order_id: razorpayOrderId,
          amount: Number.isFinite(paiseAmount) ? paiseAmount : undefined,
          currency,
          name: "Structra",
          description: `${planName} Plan`,
          theme: {
            color: "#2563eb",
          },
          handler: async (response) => {
            if (!settleOnce()) return;

            try {
              const verifyResponse = await api.post("payments/orders/verify/", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              const currentPlan = (verifyResponse.data?.current_plan || planName).toUpperCase();
              const expiresAt = verifyResponse.data?.expires_at || null;
              updateUserPlan(currentPlan, expiresAt);

              resolve({
                status: "success",
                message: `Payment Successful! Welcome to the ${currentPlan} plan.`,
                currentPlan,
                expiresAt,
              });
            } catch (error) {
              resolve({
                status: "failed",
                message: getErrorMessage(error, "Payment verification failed."),
              });
            } finally {
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
              setIsLoading(false);
            },
          },
        });

        razorpay.open();
      });

      return result;
    } catch (error) {
      setIsLoading(false);
      return {
        status: "failed",
        message: getErrorMessage(error, "Unable to start checkout."),
      };
    }
  }, [isLoading, updateUserPlan]);

  return {
    startCheckout,
    isLoading,
  };
}
