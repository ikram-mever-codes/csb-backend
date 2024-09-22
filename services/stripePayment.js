import stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

const stripePayment = async (
  paymentMethodId,
  plan,
  isRecurring,
  customerId
) => {
  try {
    let amount;
    if (plan === "basic") {
      amount = 3900; // Amount in cents
    } else if (plan === "advance") {
      amount = 9900; // Amount in cents
    } else {
      return { success: false, message: "Invalid subscription plan!" };
    }

    if (isRecurring) {
      if (!customerId) {
        return {
          success: false,
          message: "Customer ID is required for subscriptions.",
        };
      }

      const subscription = await stripeClient.subscriptions.create({
        customer: customerId,
        items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              },
              unit_amount: amount,
              recurring: { interval: "month" },
            },
          },
        ],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      return {
        success: true,
        transactionId: subscription.id,
        message: "Recurring subscription created successfully",
      };
    } else {
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method: paymentMethodId,
        customer: customerId, // Include customer if paymentMethodId belongs to a customer
        confirm: true,
        return_url: `${process.env.FRONTEND_URL}/dashboard`,
      });

      return {
        success: paymentIntent.status === "succeeded",
        transactionId: paymentIntent.id,
        message: "One-time payment successful",
      };
    }
  } catch (error) {
    console.error("Stripe payment error:", error.message);
    return { success: false, message: error.message };
  }
};

export default stripePayment;
