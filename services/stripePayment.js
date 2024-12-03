import stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

const stripePayment = async (
  paymentMethodId,
  plan,
  isRecurring,
  customerId,
  duration
) => {
  try {
    let amount;
    if (plan === "basic") {
      amount = process.env.BASIC_PRICE;
      amount = Number(amount) * duration;
    } else if (plan === "advance") {
      amount = process.env.ADVANCE_PRICE;
      amount = Number(amount) * duration;
    } else {
      return { success: false, message: "Invalid subscription plan!" };
    }

    async function createOrGetProduct(plan) {
      try {
        // First, try to find an existing product
        const existingProducts = await stripeClient.products.list({
          limit: 1,
          active: true,
          created: { gte: 0 },
          expand: ["data.default_price"],
        });

        // If a product exists, return its ID
        if (existingProducts.data.length > 0) {
          return existingProducts.data[0].id;
        }

        // If no product exists, create a new one
        const product = await stripeClient.products.create({
          name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        });

        return product.id;
      } catch (error) {
        console.error("Error creating/retrieving Stripe product:", error);
        throw error;
      }
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
              product: await createOrGetProduct(plan),

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
        customer: customerId,
        confirm: true,
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
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
